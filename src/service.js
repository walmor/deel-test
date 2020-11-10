const { Op } = require('sequelize');
const errors = require('./errors');
const { sequelize, Contract, Job, Profile } = require('./model');

const service = {
  async getContractById({ contractId, userId }) {
    const contract = await Contract.findOne({
      where: {
        id: contractId,
        [Op.or]: [{ ClientId: userId }, { ContractorId: userId }],
      },
    });

    if (!contract) {
      throw errors.ContractNotFound(contractId);
    }

    return contract;
  },

  async getActiveContracts({ userId }) {
    const contracts = await Contract.findAll({
      where: {
        status: { [Op.ne]: 'terminated' },
        [Op.or]: [{ ClientId: userId }, { ContractorId: userId }],
      },
    });

    return contracts;
  },

  async getUnpaidJobs({ userId }) {
    const unpaidJobs = await Job.findAll({
      where: {
        paid: { [Op.or]: [null, false] },
        '$Contract.status$': { [Op.ne]: 'terminated' },
        [Op.or]: [{ '$Contract.ClientId$': userId }, { '$Contract.ContractorId$': userId }],
      },
      include: Contract,
      order: ['id'],
    });

    return unpaidJobs;
  },

  async payForJob({ jobId, userId }) {
    try {
      await sequelize.transaction(async (transaction) => {
        const job = await Job.findOne({
          where: { id: jobId },
          include: { all: true, nested: true },
          transaction,
          lock: true,
        });

        if (!job) {
          throw errors.JobNotFound(jobId);
        }

        const { price, Contract } = job;
        const { Client, Contractor } = Contract;
        const { balance } = Client;

        if (Client.id !== userId) {
          throw errors.AccessDenied();
        }

        if (job.paid) {
          throw errors.JobAlreadyPaid();
        }

        if (Contract.status === 'terminated') {
          throw errors.TerminatedContract();
        }

        if (balance < price) {
          throw errors.NotEnoughBalance();
        }

        await Job.update({ paid: true, paymentDate: new Date() }, { where: { id: jobId }, transaction });
        await Profile.update({ balance: Client.balance - price }, { where: { id: Client.id }, transaction });
        await Profile.update({ balance: Contractor.balance + price }, { where: { id: Contractor.id }, transaction });
      });
    } catch (error) {
      if (errors.isHttpError(error)) {
        throw error;
      }

      // In a real app, we should log the error somewhere else, such as a monitoring tool like Sentry.
      console.log(error);
      throw errors.InternalError();
    }
  },

  async deposit({ amount, clientId }) {
    try {
      amount = parseFloat(amount);

      if (Number.isNaN(amount)) {
        throw errors.InvalidAmount();
      }

      await sequelize.transaction(async (transaction) => {
        const client = await Profile.findOne({
          where: { id: clientId },
          attributes: ['balance'],
          transaction,
        });

        if (!client) {
          throw errors.ClientNotFound(clientId);
        }

        const unpaidAmount = await Job.sum('price', {
          where: {
            paid: {
              [Op.or]: [null, false],
            },
            '$Contract.ClientId$': clientId,
          },
          include: Contract,
          transaction,
        });

        // As the clientId is coming from the URL,
        // I'm assuming this operation is being executed by an admin user,
        // so I'm not validating the clientId againt the userId.
        // I'd have asked in a real situation.

        const { balance } = client;
        const limit = unpaidAmount * 1.25;

        if (amount > limit) {
          throw errors.DepositLimitExceeded(limit);
        }

        await Profile.update({ balance: balance + amount }, { where: { id: clientId }, transaction });
      });
    } catch (error) {
      if (errors.isHttpError(error)) {
        throw error;
      }

      // In a real app, we should log the error somewhere else, such as a monitoring tool like Sentry.
      console.log(error);
      throw errors.InternalError();
    }
  },
};

module.exports = service;
