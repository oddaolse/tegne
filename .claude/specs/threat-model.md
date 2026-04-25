# Threat Model Specification

## Status

Implemented. Selected with `@type tm`. File extension: `.tm`.

## Purpose

Documents threats against systems using STRIDE. Threat models may reference elements from other diagrams and render those references as ghost nodes.

## Syntax Summary

```text
@include <filename>

@ref <filename>

boundary <id> [label:"Name"]
  ref <element-id>
end

ref <element-id>

flow <id> <from> -> <to> [label:"Description"]

threat <id> [stride:S|T|R|I|D|E] <targetId> : "Description"
mitigate <threatId> : "Description"
```

## Semantics

- `@ref` declares a referenced diagram file.
- `boundary` declares a trust boundary containing refs.
- `ref` declares a ghost element by ID.
- Refs may be inside or outside a boundary.
- `flow` connects two refs.
- `threat` targets a declared ref or flow.
- `mitigate` references a declared threat.
- Boundaries cannot be nested.
- Threat IDs and flow IDs are unique within the threat model.
- `@include` may load same-type `.tm` files from the opened project folder.
- Included files contribute display defaults and `@ref` entries only. Refs, boundaries, flows, threats, mitigations, positions, and nested includes are invalid inside included files.

## STRIDE Categories

| Code | Category |
|---|---|
| `S` | Spoofing |
| `T` | Tampering |
| `R` | Repudiation |
| `I` | Information Disclosure |
| `D` | Denial of Service |
| `E` | Elevation of Privilege |

## Rendering

- Refs render as ghost nodes with dashed borders and reduced opacity.
- When loaded through a project registry, refs use labels and type badges from referenced diagrams.
- Flows render as directed arrows.
- Threats render as coloured STRIDE badges on their target.
- Mitigated threats render with reduced opacity and dashed stroke.
- Mitigations render in a draggable panel.
- STRIDE categories in use render in a draggable key box.

Reserved positions:

| ID | Meaning |
|---|---|
| `__meta__` | metadata box |
| `__mitigations__` | mitigations panel |
| `__stride_key__` | STRIDE key |

## Valid Example

```text
@type tm
@name API Threat Model

@ref integration_example.id

boundary internet [label:"Internet"]
  ref customer_browser
end

boundary app_tier [label:"Application Tier"]
  ref order_service
  ref payment_service
end

flow f1 customer_browser -> order_service [label:"HTTPS"]
flow f2 order_service -> payment_service [label:"REST"]

threat T1 [stride:S] f1 : "Session hijack via stolen token"
threat T2 [stride:T] order_service : "Injection attack on order API"

mitigate T1 : "Short-lived JWT with audience binding"
```

## Invalid Cases

- flow references unknown ref
- threat targets unknown ref or flow
- mitigation references unknown threat
- invalid STRIDE category
- nested or unclosed boundary

## Required Tests

- parser tests for refs, boundaries, flows, threats, mitigations, and invalid references
- fixture tests with all STRIDE categories
- renderer or geometry tests when ghost nodes, badges, panels, or boundary behaviour changes
