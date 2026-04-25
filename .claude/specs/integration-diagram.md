# Integration Diagram Specification

## Status

Implemented. Selected with `@type id`. File extension: `.id`.

## Purpose

Documents IT architecture: systems, databases, queues, technical connections, platform ownership, lifecycle state, and logical groups.

## Syntax Summary

```text
@include <filename>

@location-types
  <name> <palette-colour>

system   <id> [<location-type>] [new|changing|decommissioned] [placement:inside|below] [label:"Name"]
database <id> [<location-type>] [new|changing|decommissioned] [placement:inside|below] [label:"Name"]
queue    <id> [<location-type>] [new|changing|decommissioned] [placement:inside|below] [label:"Name"]

connect <from> ->  <to> : <protocol>
connect <from> <-> <to> : <protocol>

group <id> <label> [corner:upper-left|upper-right|lower-left|lower-right]
  system/database/queue declarations
end
```

Palette colours: `green`, `blue`, `red`, `orange`, `purple`, `grey`, `yellow`, `cyan`, `pink`, `teal`.

## Semantics

- Each element must declare a known location type.
- Element IDs are unique within the diagram.
- `system`, `database`, and `queue` are connection endpoints.
- Connections must reference declared endpoint IDs.
- `->` is unidirectional.
- `<->` is bidirectional.
- Protocol labels are free-form text after `:`.
- Groups cannot be nested.
- An element may belong to at most one group.
- `@include` may load same-type `.id` files from the opened project folder.
- Included files contribute location types and display defaults only. Positional elements, `@position`, and nested includes are invalid inside included files.
- Included location types merge before local location types; duplicate names across includes or between include and host are parse errors.

## Lifecycle State

| State | Meaning | Visual |
|---|---|---|
| absent/current | existing element | solid border, full fill |
| `new` | being introduced | thick solid border |
| `changing` | being modified | dashed border, reduced fill |
| `decommissioned` | being retired | dotted border, grey fill |

## Rendering

| Element | Shape | Default label placement |
|---|---|---|
| `system` | rectangle | inside |
| `database` | vertical drum | below |
| `queue` | horizontal cylinder | below |

Connections use closed arrowheads except when either endpoint is a queue; queue connections use open arrowheads. The legend shows only location/state combinations used in the diagram.

## Valid Example

```text
@type id

@location-types
  aws orange
  azure blue
  on-prem grey

system OrderSvc [aws]
database CustomerDB [on-prem]
queue OrderQueue [aws]

connect OrderSvc -> OrderQueue : SQS
connect OrderSvc <-> CustomerDB : JDBC
```

## Invalid Cases

- unknown location type
- missing location type
- duplicate element ID
- connection to unknown ID
- invalid direction token
- nested or unclosed group

## Required Tests

- parser tests for all element kinds, states, placement overrides, and connections
- fixture tests for minimal and full diagrams
- renderer or geometry tests when shapes, arrows, legends, or state visuals change
