import { parsePropsSchema, type ComponentPropDefinition } from './component-props.js';
import type { ComponentCatalogEntry } from './component-catalog.js';
import type { IslandCatalogEntry, ViewCatalog } from './island-catalog.js';

export interface ComponentCatalogExportEntry extends ComponentCatalogEntry {
  propsSchema: ComponentPropDefinition[];
}

export interface ViewCatalogExport {
  generatedAt: string;
  components: ComponentCatalogExportEntry[];
  islands: IslandCatalogEntry[];
}

export function serializeViewCatalog(catalog: ViewCatalog): ViewCatalogExport {
  return {
    generatedAt: new Date().toISOString(),
    components: catalog.components.map((entry) => ({
      ...entry,
      propsSchema: parsePropsSchema(entry.props),
    })),
    islands: catalog.islands,
  };
}