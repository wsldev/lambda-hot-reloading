import { createClient } from 'redis';

const client = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: 6379
    }
})

export { client }