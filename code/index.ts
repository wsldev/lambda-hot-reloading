import middy from '@middy/core'
import doNotWaitForEmptyEventLoop from '@middy/do-not-wait-for-empty-event-loop'
import { Context, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod'
import { client } from './redis';
// import mockAgencias from './agencias.json' assert { type: 'json'};

export const agencyByIdRequest = z.object({
    codAgencia: z.string()
        .pipe(
            z.coerce.number({
                invalid_type_error: 'codAgencia must be a number',
            })
            .int()
            .gte(1000, {message: 'codAgencia must be 4 digit'})
            .lte(9999, {message: 'codAgencia must be 4 digit'})
        )
    
});

export const agenciesByCepRequest = z.object({
    cep: z.coerce.string().regex(/^[0-9]{5}-[0-9]{3}$/, {message: 'cep must be a valid CEP'}),
});

export const agenciesByLocationRequest = z.object({
    lat: z.string({required_error: 'lat is required'})
        .regex(/^-?\d+\.?\d*$/, {message: 'lat must be a number'}),
    long: z.string({required_error: 'long is required'})
        .regex(/^-?\d+\.?\d*$/, {message: 'long must be a number'}),
    distancia: z.coerce.number().gte(1).lte(100).optional().default(5),
    tipoAgencia: z.enum(['varejo', 'person']).optional(),
    cambio: z.union([z.boolean().optional(), z.literal('true'), z.literal('false')])
    .transform((value) => value === true || value === 'true'),
})

export type AgencyByIdRequest = z.infer<typeof agencyByIdRequest>;
export type AgenciesByCepRequest = z.infer<typeof agenciesByCepRequest>;
export type AgenciesByLocationRequest = z.infer<typeof agenciesByLocationRequest>;

let storage = {}

let count = 0

export const lambdaHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        count += 1
        // if (event.queryStringParameters?.seed) {
        //     console.log('seeding redis...')
        //     // await seedRedis(mockAgencias)
        // }

        const validate = validateQueryParams(event.queryStringParameters!)
        const filter = createQueryFilter(validate)
        const agenciesByFilter = await getAgencyByFilters(filter)
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Hello World!!!',
                host: process.env.LOCALSTACK_HOSTNAME,
                count,
                storage,
                validate,
                filter,
                agenciesByFilter
            }),
         };
    } catch (error) {
        return {
            statusCode: 400,
            body: error.message
        }
    }
};

async function seedRedis(agencias) {
    const obj = agencias.map(agency => {
        return {
            ...agency,
            agencyId: agency.agencyName.split('.')[1].trim().slice(0, 4)
        }
    })
    await client.connect();
    await client.json.set('agencias', '$', obj);
    await client.disconnect();
}

async function getAgencyByFilters(filters) {
    await client.connect();
    const agencia = await client.json.get(`agencias`, {
        path: `$.[?(${filters})]`,
    }) as Array<any>;
    await client.disconnect()
    return agencia.length ? agencia :'nenhuma agencia encontrada'
}

const queryFields = {
    cambio:'@.hasExchange',
    tipoAgencia:'@.type',
    cep:'@.zipCode',
    codAgencia:'@.agencyId'
}

function createQueryFilter(query) {
    if (query.codAgencia) {
        return `@.agencyId=='${query.codAgencia}'`
    } else {
        const result = Object.keys(query).map(key => {
            let filter = ''
            if (!!queryFields[key]) {
                filter = `${queryFields[key]}==${key === 'cambio' ? query[key] : `'${query[key]}'`}`
            }
            return `${filter}`
        }).filter(Boolean).join(' && ')
        return result.length ? result : '$'
    }
}

function validateQueryParams(query) {
    if (query?.codAgencia) {
        return agencyByIdRequest.parse(query)
    } else if(query?.cep) {
        query.cep = query.cep
            .replace(/(\d{5})(\d)/, '$1-$2')
        return agenciesByCepRequest.parse(query)

    } else {
        return agenciesByLocationRequest.parse(query)
    }

}

const isEqual = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b)
}


const cacheMiddleware = (options) => {
    const cacheMiddlewareBefore = async (request) => {
    if (options.storage.hasOwnProperty('cacheKeyRequest')) {
        if (options.storage.hasOwnProperty('cacheKeyRequest') && !isEqual(options.storage['cacheKeyRequest'], request.event.queryStringParameters)) {
            delete storage['cacheKeyRequest']
            delete storage['cacheKeyResponse']
        }
    }
      if (options.storage.hasOwnProperty('cacheKeyResponse') && options.storage.hasOwnProperty('cacheKeyRequest')) {
        //   exits early and returns the value from the cache if it's already there
        //   const cacheResponse = options.storage['cacheKeyResponse']
        //   const cacheRequest = options.storage['cacheKeyRequest']
        //   options.storage['cacheKeyResponse'].statusCode = 202
        //   return {
        //     responseCache: cacheResponse,
        //     eventCache: cacheRequest,
        //     query: request.event.queryStringParameters
        //   }
        return options.storage['cacheKeyResponse']

      }
    }
  
    const cacheMiddlewareAfter = async (request) => {
      // stores response in the cache
    //   console.log('response', request.response)
      options.storage['cacheKeyResponse'] = request.response
      options.storage['cacheKeyRequest'] = request.event.queryStringParameters
    }
  
    return {
      before: cacheMiddlewareBefore,
      after: cacheMiddlewareAfter
    }
  }

export const handler = middy<APIGatewayProxyEvent, APIGatewayProxyResult>()
    .use(doNotWaitForEmptyEventLoop({ runOnError: true }))
    .before(async (request) => {
        // do something in the before phase
        // count += 1
        request.event.body = 
        typeof request.event.body === 'string' 
            ? JSON.parse(request.event.body) 
            : request.event.body
        request.event.queryStringParameters =
        typeof request.event.queryStringParameters === 'string' 
            ? JSON.parse(request.event.queryStringParameters) 
            : (request.event.queryStringParameters ?? {})
    })
    .after(async (request) => {
        // do something in the after phase
    })
    .onError(async (request) => {
        // do something in the on error phase
        // console.log('response', request)
    })
    .use(cacheMiddleware({ storage }))
    .handler(lambdaHandler)

// mapa-de-agencias?lat=-23.5667526&long=-46.6494164
// &tipoAgencia=varejo
// &tipoAgencia=personnalite
// &cambio=true

/**
 * Payload
 * {
	"seed": false,
	"agencyId": "8577",
	"agencyType": "varejo",
	"zipCode": "04116-120",
	"cep": "04116-120",
	"tipoAgencia": "person",
	"cambio": true,
	"codAgencia": "8577"
}
 */