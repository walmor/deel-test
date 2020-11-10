const { Op } = require('sequelize');
const errors = require('./errors');
const { Contract } = require('./model');

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
};

module.exports = service;
