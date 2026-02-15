import type { AppRouterClient } from "@spectracker/api/routers/index";

import { defineNuxtPlugin } from "#app";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const rpcUrl = `${config.public.serverUrl}/rpc`;

  const rpcLink = new RPCLink({
    url: rpcUrl,
  });

  const client: AppRouterClient = createORPCClient(rpcLink);
  const orpcUtils = createTanstackQueryUtils(client);

  return {
    provide: {
      orpc: orpcUtils,
    },
  };
});
