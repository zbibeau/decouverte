import { createClient, type NormalizeOAS } from 'fets';

import type openapi from './generated/spec';

export type ClientType = NormalizeOAS<typeof openapi>;

const client = createClient<ClientType>({
  //@ts-ignore
  endpoint: import.meta.env.VITE_REST_URL,
});

export default client;
