import { buildPendingAccount } from "@/services/sms-edit-modal-service";

describe("sms-edit-modal-service", () => {
  it("infers wallet pending accounts from known wallet senders", () => {
    const pendingAccount = buildPendingAccount("temp-wallet-1", {
      name: "Vodafone Cash",
      currency: "EGP",
      senderDisplayName: "VodafoneCash",
    });

    expect(pendingAccount).toMatchObject({
      tempId: "temp-wallet-1",
      type: "DIGITAL_WALLET",
    });
  });

  it("keeps unknown SMS-created pending accounts as bank accounts", () => {
    const pendingAccount = buildPendingAccount("temp-bank-1", {
      name: "Unknown Bank",
      currency: "EGP",
      senderDisplayName: "UNKNOWN",
      cardLast4: "1234",
    });

    expect(pendingAccount).toMatchObject({
      tempId: "temp-bank-1",
      type: "BANK",
      cardLast4: "1234",
    });
  });
});
