const errors = require('./errors');
const seed = require('./seedDb');
const service = require('./service');
const { Job, Profile } = require('./model');

beforeEach(async () => {
  await seed();
});

describe('Deel Task API', () => {
  describe('when getting a contract by id', () => {
    it('should throw error if there is no contract with the given id', async () => {
      const invalidContractId = 999;

      const getContractById = service.getContractById({
        contractId: invalidContractId,
        userId: 1,
      });

      await expect(getContractById).rejects.toMatchObject({ ...errors.ContractNotFound(invalidContractId) });
    });

    it('should throw error if the contract does not belong to the user', async () => {
      const contractId = 3; // This contract belongs to user 2

      const getContractById = service.getContractById({
        contractId,
        userId: 1, // And we're trying to access with user 1.
      });

      await expect(getContractById).rejects.toMatchObject({ ...errors.ContractNotFound(contractId) });
    });

    it('should return the contract if it belongs to the user', async () => {
      const contractId = 1; // This contract belongs to user 1

      const contract = await service.getContractById({
        contractId,
        userId: 1, // And we're trying to access with user 1.
      });

      expect(contract).toBeDefined();
      expect(contract.id).toEqual(contractId);
    });
  });

  describe('when getting active contracts', () => {
    it('should a list of active contracts that belongs to a client', async () => {
      const clientId = 1; // 1 is the id of a client with 1 in-progress and 1 terminated contract

      const contracts = await service.getActiveContracts({ userId: clientId });

      expect(contracts).toHaveLength(1);
      expect(contracts[0].status).toEqual('in_progress');
    });

    it('should a list of active contracts that belongs to a contractor', async () => {
      const contractorId = 8; // 8 is the id of a contractor with 1 in-progress and 1 new contract

      const contracts = await service.getActiveContracts({ userId: contractorId });

      expect(contracts).toHaveLength(2);
      expect(contracts[0].status).toEqual('new');
      expect(contracts[1].status).toEqual('in_progress');
    });
  });

  describe('when getting unpaid jobs', () => {
    it('should return unpaid jobs for non-terminated contracts that belong to a client', async () => {
      // client 1 has two unpaid jobs but one is within a terminated contract
      const clientId = 1;

      const unpaidJobs = await service.getUnpaidJobs({ userId: clientId });

      expect(unpaidJobs).toHaveLength(1);
      expect(unpaidJobs[0].id).toEqual(2);
    });

    it('should return unpaid jobs for non-terminated contracts that belong to a contractor', async () => {
      // contractor 6 has two unpaid jobs
      const contractorId = 6;

      const unpaidJobs = await service.getUnpaidJobs({ userId: contractorId });

      expect(unpaidJobs).toHaveLength(2);
      expect(unpaidJobs[0].id).toEqual(2);
      expect(unpaidJobs[1].id).toEqual(3);
    });

    it('should return return an empty list if the contractor has no unpaid jobs', async () => {
      // contractor 5 has no unpaid jobs
      const contractorId = 5;

      const unpaidJobs = await service.getUnpaidJobs({ userId: contractorId });

      expect(unpaidJobs).toHaveLength(0);
    });
  });

  describe('when paying for a job', () => {
    it('should throw error if the job does not exist', async () => {
      const invalidJobId = 999;

      const payForJob = service.payForJob({ jobId: invalidJobId, userId: 1 });

      await expect(payForJob).rejects.toMatchObject({ ...errors.JobNotFound(invalidJobId) });
    });

    it('should throw error if the job does not belong to the client', async () => {
      const jobId = 2; // Job 2 belongs to client 1;
      const clientId = 2; // But we're trying to access with client 2;

      const payForJob = service.payForJob({ jobId, userId: clientId });

      await expect(payForJob).rejects.toMatchObject({ ...errors.AccessDenied(jobId) });
    });

    it('should throw error if the job is already paid', async () => {
      const paidJobId = 7; // Job 7 is already paid;
      const clientId = 1;

      const payForJob = service.payForJob({ jobId: paidJobId, userId: clientId });

      await expect(payForJob).rejects.toMatchObject({ ...errors.JobAlreadyPaid() });
    });

    it('should throw error if the contract is terminated', async () => {
      const jobId = 1; // Job 1 is not paid but its contract is terminated;
      const clientId = 1;

      const payForJob = service.payForJob({ jobId, userId: clientId });

      await expect(payForJob).rejects.toMatchObject({ ...errors.TerminatedContract() });
    });

    it('should throw error if the client has not enough balance', async () => {
      const jobId = 5; // Job 5's price is $200 but the client has only $1.3;
      const clientId = 4;

      const payForJob = service.payForJob({ jobId, userId: clientId });

      await expect(payForJob).rejects.toMatchObject({ ...errors.NotEnoughBalance() });
    });

    it('should mark the job as paid and set the balances when all the validations pass', async () => {
      const jobId = 2; // Job 2's price is $201
      const clientId = 1; // Client 1 has $1150
      const contratorId = 6; // Contractor 6 has $1214

      await service.payForJob({ jobId, userId: clientId });

      const job = await Job.findByPk(jobId);
      const client = await Profile.findByPk(clientId);
      const contractor = await Profile.findByPk(contratorId);

      expect(job.paid).toBe(true);
      expect(job.paymentDate).toBeInstanceOf(Date);

      expect(client.balance).toEqual(949); // 1350 - 201
      expect(contractor.balance).toEqual(1415); // 1214 + 201
    });
  });
});
