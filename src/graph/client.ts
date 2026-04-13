import { GraphQLClient } from "graphql-request";

function createGraphClient(): GraphQLClient {
  const url = process.env.NEXT_PUBLIC_GRAPH_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_GRAPH_URL environment variable is required");
  }

  return new GraphQLClient(url);
}

let graphClientInstance: GraphQLClient | undefined;

export function getGraphClient(): GraphQLClient {
  if (!graphClientInstance) {
    graphClientInstance = createGraphClient();
  }
  return graphClientInstance;
}
