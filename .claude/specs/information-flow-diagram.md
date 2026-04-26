# Information Flow Diagram Specification

## Status

Implemented. Selected with `@type infoflow`. File extension: `.iff`.

## Purpose

Documents how business information is owned, copied, transformed, enriched, aggregated, published, ingested, and served across stores and processes. It is concerned with data semantics and change scope, not transport mechanics.

## Syntax Summary

```text
@include <filename>

@location-types
  <name> <palette-colour>

@systems
  <name> <palette-colour>

@flow-types
  sync solid
  async dashed
  batch thick

store <id> [<location-type>] [unchanged|new|changing|decommissioned] [label:"Name"]
process <id> [<system>] [unchanged|new|changing|decommissioned] [label:"Name"]

connect <from> ->  <to> : <relationship> [flow:<type>]
connect <from> <-  <to> : <relationship> [flow:<type>]
connect <from> <-> <to> : <relationship> [flow:<type>]

group <id> "<label>" [system:<system>] [corner:upper-left|upper-right|lower-left|lower-right]
  store declarations
  process declarations
  connect declarations
end
```

Palette colours: `green`, `blue`, `red`, `orange`, `purple`, `grey`, `yellow`, `cyan`, `pink`, `teal`.

## EBNF

This grammar describes the implemented syntax. Semantic validation is listed in the next section.

```text
document        = { line } ;
line            = metadata | palette_block | declaration | position | comment | blank ;

metadata        = "@type" "infoflow"
                | "@include" filename
                | "@name" text
                | "@version" text
                | "@date" text
                | "@author" text
                | "@theme" ("dark" | "light" | "tokyo")
                | "@orientation" ("landscape" | "portrait")
                | "@size" ("a4" | "a3" | "a2" | "a1" | "a0")
                | "@legend" ("on" | "off")
                | "@show-ids" ("on" | "off") ;

palette_block   = location_types | systems | flow_types ;
location_types  = "@location-types" newline { indented identifier colour newline } ;
systems         = "@systems" newline { indented identifier colour newline } ;
flow_types      = "@flow-types" newline { indented identifier flow_style newline } ;

declaration     = store | process | connect | link_legacy | group ;

store           = "store" id { bracketed_store_attr } ;
process         = "process" id { bracketed_process_attr } ;
connect         = "connect" id connect_operator id ":" relationship [ bracketed_flow_attr | bracketed_legacy_flow ] ;
link_legacy     = "link" id connect_operator id ":" relationship [ bracketed_flow_attr | bracketed_legacy_flow ] ;
connect_operator = "->" | "<-" | "<->" ;
group           = "group" id label { bracketed_group_attr } newline
                  { store | process | connect | link_legacy | comment | blank }
                  "end" ;

position        = "@position" id number number ;

bracketed_store_attr   = "[" (location_type | state | label_attr) "]" ;
bracketed_process_attr = "[" (system_name | state | label_attr) "]" ;
bracketed_group_attr   = "[" (system_attr | corner_attr) "]" ;
bracketed_flow_attr    = "[" "flow:" flow_type "]" ;
bracketed_legacy_flow  = "[" text "]" ;

label_attr      = "label:" quoted_text ;
system_attr     = "system:" system_name ;
corner_attr     = "corner:" ("upper-left" | "upper-right" | "lower-left" | "lower-right") ;

state           = "unchanged" | "new" | "changing" | "decommissioned" ;
relationship    = "replicate" | "publish" | "ingest" | "derive"
                | "aggregate" | "enrich" | "serve" ;
flow_style      = "solid" | "dashed" | "thick" ;
colour          = "green" | "blue" | "red" | "orange" | "purple"
                | "grey" | "yellow" | "cyan" | "pink" | "teal" ;

comment         = "#" text ;
blank           = "" ;
```

## Semantics

- `store` is a persistent data container: database, file, cache, warehouse, stream, or similar.
- `process` is an active component: service, application, batch job, or similar.
- Store location type is required and must be declared in `@location-types`.
- Process system is required unless inherited from parent `group [system:<name>]`.
- `unchanged` is accepted as an alias for the default current state.
- Node IDs are unique across stores and processes.
- Connections may connect any declared node IDs.
- Connection operators define direction: `->` flows left-to-right, `<-` flows right-to-left, and `<->` is bidirectional.
- Groups cannot be nested.
- A node may belong to at most one group.
- Legacy bare connection qualifiers such as `[kafka]` are accepted for backward compatibility, but preferred syntax is `[flow:<type>]`.
- `link` is accepted as a legacy alias for `connect`; new diagrams should use `connect`.
- `@include` may load same-type `.iff` files from the opened project folder.
- Included files contribute `@location-types`, `@systems`, `@flow-types`, and display defaults only. Stores, processes, connections, groups, positions, and nested includes are invalid inside included files.
- Included dictionaries merge before local dictionaries; duplicate names across includes or between include and host are parse errors.

## Relationships

Supported relationship names:

| Relationship | Meaning |
|---|---|
| `replicate` | Copy information from one store/system to another without changing its business meaning. |
| `publish` | Make information available as an event/message for one or more consumers. |
| `ingest` | Load information into a target store or platform for further use. |
| `derive` | Create new information from existing information by rules, calculation, classification, or analysis. |
| `aggregate` | Combine or summarize information from multiple records or sources. |
| `enrich` | Add additional attributes to existing information from another source. |
| `serve` | Provide information to a consuming process, application, channel, or user-facing component. |

The vocabulary is intentionally constrained to improve later analysis. Removed verbs are rejected with migration guidance: use `serve` instead of `query`, model producer-side `publish` instead of `subscribe`, and replace `merge` with `aggregate`, `derive`, or `enrich` based on meaning.

Default flow inference:

| Relationships | Default flow |
|---|---|
| `replicate`, `publish`, `ingest`, `derive`, `aggregate` | `async` |
| `enrich`, `serve` | `sync` |

## State Visuals

| State | Visual |
|---|---|
| absent/current/`unchanged` | solid border |
| `changing` | dashed border |
| `new` | dotted border |
| `decommissioned` | solid border with X marker |

## Rendering

| Node | Shape | Colour source |
|---|---|---|
| `store` | database drum | location type |
| `process` | rectangle | system |

The legend is divided into store location types, process systems, and flow types. Edge routing must be shape-aware.

## Valid Example

```text
@type infoflow
@name Customer Information Landscape

@location-types
  master blue
  replica cyan
  aggregate purple
  reference grey

@systems
  SystemA blue
  SystemB teal

@flow-types
  sync solid
  async dashed
  batch thick

group customer_domain "Customer Domain" [system:SystemA] [corner:upper-left]
  store cis [master] [label:"CIS"]
  store cdp [replica] [changing] [label:"CDP"]
  process cis_sync [label:"CIS Sync Service"]
  connect cis -> cis_sync : serve [flow:sync]
  connect cis_sync -> cdp : replicate [flow:batch]
  connect cis <-> cdp : aggregate [flow:sync]
end

store ext_ref [reference] [label:"External Reference Data"]
process analytics_job [SystemB] [new] [label:"Analytics Job"]
connect ext_ref -> analytics_job : enrich [flow:sync]
```

## Invalid Cases

- store without location type
- process without system and no inherited group system
- unknown location type
- unknown system
- unknown explicit flow type
- duplicate node ID
- connection to unknown node ID
- nested group

## Required Tests

- parser tests for stores, processes, systems, flow types, inheritance, and invalid cases
- fixture tests for legacy store-only and mixed store/process diagrams
- layout tests for mixed nodes and saved positions
- geometry tests for store drum, process rectangle, state visuals, edge routing, and flow styling
