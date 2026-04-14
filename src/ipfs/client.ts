import { PinataSDK } from "pinata";

function createPinataClient(): PinataSDK {
  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY;

  if (!jwt) {
    throw new Error("PINATA_JWT environment variable is required");
  }
  if (!gateway) {
    throw new Error("PINATA_GATEWAY environment variable is required");
  }

  return new PinataSDK({ pinataJwt: jwt, pinataGateway: gateway });
}

let pinataInstance: PinataSDK | undefined;

export function getPinataClient(): PinataSDK {
  if (!pinataInstance) {
    pinataInstance = createPinataClient();
  }
  return pinataInstance;
}
