import { expect } from "chai";
import Message from "../models/message.model.js";

describe("Message model", () => {
  it("should accept Album as a shared entity type", () => {
    const message = new Message({
      conversation_id: "507f1f77bcf86cd799439011",
      sender_id: "507f1f77bcf86cd799439022",
      shared_entity: {
        type: "Album",
        id: "507f1f77bcf86cd799439033",
      },
    });

    const error = message.validateSync();

    expect(error).to.equal(undefined);
  });
});
