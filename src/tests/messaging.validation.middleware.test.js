import { expect } from "chai";
import sinon from "sinon";
import messagingValidation from "../middleware/messaging.validation.middleware.js";

const mockRes = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

describe("messaging.validation.middleware", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should allow Album as a shared entity type", () => {
    const req = {
      body: {
        shared_entity: {
          type: "Album",
          id: "507f1f77bcf86cd799439011",
        },
      },
    };
    const res = mockRes();
    const next = sinon.stub();

    messagingValidation.validateSendMessage(req, res, next);

    expect(next.calledOnce).to.be.true;
    expect(res.status.called).to.be.false;
  });
});
