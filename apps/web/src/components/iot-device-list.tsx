import type { IotEntity } from '@pcc/contracts'

export interface IotDeviceListProps {
  entities: IotEntity[]
  error?: string
}

/** Lists Home Assistant entities grouped by domain; degrades on error. */
export function IotDeviceList({ entities, error }: IotDeviceListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Devices unavailable
      </p>
    )
  }

  const byDomain = new Map<string, IotEntity[]>()
  for (const entity of entities) {
    const list = byDomain.get(entity.domain) ?? []
    list.push(entity)
    byDomain.set(entity.domain, list)
  }

  return (
    <div className="space-y-6">
      {[...byDomain.entries()].map(([domain, list]) => (
        <section key={domain} data-testid={`domain-${domain}`}>
          <h3 className="mb-2 font-semibold capitalize">{domain}</h3>
          <ul className="divide-y rounded border">
            {list.map((entity) => (
              <li
                key={entity.entityId}
                className="flex justify-between px-3 py-2 text-sm"
              >
                <span>{entity.name}</span>
                <span className="text-gray-600">
                  {entity.state}
                  {entity.unit ? ` ${entity.unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
