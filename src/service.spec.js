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
});
