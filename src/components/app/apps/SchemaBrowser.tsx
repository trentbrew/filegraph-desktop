import { useState } from 'react'
import { useSchemaIndex } from '@/hooks/useSchemaIndex'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SchemaGraph } from './schema/SchemaGraph'
import { EntityTypeCard } from './schema/EntityTypeCard'
import { RefreshCw, Search, Network, Database, Info, Loader2 } from 'lucide-react'

export function SchemaBrowser() {
  const { schema, isLoading, error, refreshSchema } = useSchemaIndex()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null)

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading || !schema) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Analyzing vault schema...</span>
        </div>
      </div>
    )
  }

  const entityTypes = Array.from(schema.entityTypes.values())
  const filteredTypes = searchQuery
    ? entityTypes.filter(
        (type) =>
          type.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.namespace.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : entityTypes

  const selectedType = selectedNamespace ? schema.entityTypes.get(selectedNamespace) : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Schema Browser</h2>
          <span className="text-sm text-muted-foreground">
            {schema.totalEntities} entities · {schema.entityTypes.size} types
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={refreshSchema} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="graph" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="graph" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Graph View
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Entity Types
          </TabsTrigger>
          <TabsTrigger value="jsonld" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            JSON-LD
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="flex-1 mt-0">
          <div className="h-full">
            <SchemaGraph entityTypes={schema.entityTypes} onNodeClick={setSelectedNamespace} />
          </div>
        </TabsContent>

        <TabsContent value="types" className="flex-1 mt-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entity types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {filteredTypes.map((type) => (
                  <EntityTypeCard key={type.namespace} entityType={type} />
                ))}
                {filteredTypes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No entity types found</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="jsonld" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">JSON-LD Compliance</h3>
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{schema.jsonLDCompliance.percentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">
                      {schema.jsonLDCompliance.compliantFiles} of {schema.jsonLDCompliance.totalFiles} files
                    </div>
                  </div>
                  {schema.jsonLDCompliance.percentage === 100 ? (
                    <div className="text-green-500">✓ Fully compliant</div>
                  ) : (
                    <div className="text-amber-500">⚠ Needs migration</div>
                  )}
                </div>
              </div>

              {schema.jsonLDCompliance.issues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Issues Found</h3>
                  <div className="space-y-2">
                    {schema.jsonLDCompliance.issues.map((issue, index) => (
                      <Alert key={index}>
                        <AlertDescription>
                          <div className="font-semibold mb-1">{issue.file}</div>
                          <ul className="text-xs space-y-1 list-disc list-inside">
                            {issue.errors.slice(0, 5).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                            {issue.errors.length > 5 && (
                              <li className="text-muted-foreground">... and {issue.errors.length - 5} more</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">What is JSON-LD?</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  JSON-LD (JSON for Linking Data) makes your .data files portable linked data. With proper @context,
                  @id, and @type fields, your entities become:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Portable across Filegraph instances</li>
                  <li>Compatible with any JSON-LD-aware tool</li>
                  <li>Part of the semantic web</li>
                  <li>Queryable with standard SPARQL</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Migration</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  To migrate your existing .data files to JSON-LD format:
                </p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  pnpm tsx scripts/migrate-to-jsonld.ts --dry-run{'\n'}
                  pnpm tsx scripts/migrate-to-jsonld.ts
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Example JSON-LD Entity</h3>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {`{
  "@context": "https://filegraph.dev/context.jsonld",
  "@id": "fg:person:sarah-chen:001",
  "@type": ["Entity", "Person"],
  "slug": "sarah-chen",
  "name": "Sarah Chen",
  "email": "sarah@example.com",
  "worksFor": "fg:org:acme:001",
  "mentions": ["fg:file:@notes/meeting-notes.note"]
}`}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="about" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">What is the Schema Browser?</h3>
                <p className="text-sm text-muted-foreground">
                  The Schema Browser treats your vault's ontology as a first-class queryable graph. It analyzes your
                  .data files to extract entity types, properties, and relationships, giving you a living map of your
                  knowledge structure.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Entity Types</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Each namespace in your vault represents an entity type. The Schema Browser shows:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>How many entities exist of each type</li>
                  <li>What properties each type has</li>
                  <li>Which properties are required vs optional</li>
                  <li>Property types (string, number, reference, etc.)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Relationships</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  The graph view visualizes how entity types connect:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Arrows show reference relationships between types</li>
                  <li>Edge labels indicate the property name</li>
                  <li>Line thickness represents relationship frequency</li>
                  <li>Click nodes to see detailed type information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Schema as Data</h3>
                <p className="text-sm text-muted-foreground">
                  Unlike traditional tools where schema is implicit, Filegraph treats schema as queryable graph data.
                  This means you can:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mt-2">
                  <li>Query schema structure through the agent</li>
                  <li>Validate data against discovered patterns</li>
                  <li>Detect schema drift and inconsistencies</li>
                  <li>Evolve your ontology organically</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Last analyzed: {new Date(schema.lastAnalyzed).toLocaleString()}
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {selectedType && (
        <div className="border-t p-4 bg-muted/50">
          <div className="max-w-2xl">
            <EntityTypeCard entityType={selectedType} />
          </div>
        </div>
      )}
    </div>
  )
}
