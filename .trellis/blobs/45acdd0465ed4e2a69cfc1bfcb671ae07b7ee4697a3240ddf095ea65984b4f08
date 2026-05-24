import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EntityTypeSchema, PropertySchema } from '@/lib/schema'
import { Database, ArrowRight, ArrowLeft, Hash } from 'lucide-react'

interface EntityTypeCardProps {
  entityType: EntityTypeSchema
}

function PropertyRow({ property }: { property: PropertySchema }) {
  const typeColor = {
    string: 'bg-blue-500/10 text-blue-500',
    number: 'bg-green-500/10 text-green-500',
    boolean: 'bg-purple-500/10 text-purple-500',
    array: 'bg-orange-500/10 text-orange-500',
    object: 'bg-pink-500/10 text-pink-500',
    reference: 'bg-cyan-500/10 text-cyan-500',
    date: 'bg-amber-500/10 text-amber-500',
  }[property.type]

  return (
    <div className="flex items-start justify-between py-2 text-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono">{property.name}</code>
          {property.isRequired && (
            <Badge variant="outline" className="text-xs">
              required
            </Badge>
          )}
          {property.isArray && (
            <Badge variant="outline" className="text-xs">
              []
            </Badge>
          )}
        </div>
        {property.referenceTypes && property.referenceTypes.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">→ {property.referenceTypes.join(', ')}</div>
        )}
      </div>
      <Badge className={typeColor}>{property.type}</Badge>
    </div>
  )
}

export function EntityTypeCard({ entityType }: EntityTypeCardProps) {
  const properties = Array.from(entityType.properties.values()).sort((a, b) => {
    if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const outgoingRelations = Array.from(entityType.outgoingRelations.entries())
  const incomingRelations = Array.from(entityType.incomingRelations.entries())

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>{entityType.label}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Hash className="h-3 w-3 mr-1" />
              {entityType.count}
            </Badge>
          </div>
        </div>
        <CardDescription>
          <code className="text-xs">{entityType.filePath}</code>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Properties</h4>
          <div className="space-y-1">
            {properties.map((prop) => (
              <PropertyRow key={prop.name} property={prop} />
            ))}
          </div>
        </div>

        {outgoingRelations.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Outgoing Relations</h4>
              </div>
              <div className="space-y-1">
                {outgoingRelations.map(([relation, targets]) => (
                  <div key={relation} className="text-sm flex items-center gap-2">
                    <code className="text-xs font-mono">{relation}</code>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-xs text-muted-foreground">{Array.from(targets).join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {incomingRelations.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Incoming Relations</h4>
              </div>
              <div className="space-y-1">
                {incomingRelations.map(([relation, sources]) => (
                  <div key={relation} className="text-sm flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{Array.from(sources).join(', ')}</span>
                    <span className="text-muted-foreground">→</span>
                    <code className="text-xs font-mono">{relation}</code>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {entityType.sampleIds.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Sample IDs</h4>
              <div className="flex flex-wrap gap-1">
                {entityType.sampleIds.map((id) => (
                  <Badge key={id} variant="outline" className="text-xs font-mono">
                    {id}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
