import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function redis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required')
  _redis = new Redis({ url, token })
  return _redis
}
