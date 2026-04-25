# Stock-and-Flow Diagram Specification

## Status

Implemented. Selected with absent `@type` or `@type sd`. File extension: `.sd`.

## Purpose

Documents Forrester/System Dynamics structure: stocks, flows, clouds, auxiliary variables, and causal connectors. The diagram is structural only; no simulation or equation evaluation is performed.

## Syntax Summary

```text
@include <filename>

stock <name>
cloud <name> [source|sink]
flow <from> -> <to> : <label> (+|-) [weak|medium|strong]
aux <name>
aux <name> <- <source> (+|-)
aux <name> <- <source1> (+|-), <source2> (+|-)
connector <target> <- <source> (+|-)
connector <target> <- <source1> (+|-), <source2> (+|-)

group <id> <label> [corner:upper-left|upper-right|lower-left|lower-right]
  stock and aux declarations
end
```

## Semantics

- `stock` is an accumulation.
- `cloud` is a model boundary; default role is `source`.
- `flow` moves material between stocks and clouds.
- `aux` is an intermediate variable.
- `connector` is an information or causal link.
- Flow polarity is required and is `+` or `-`.
- Flow strength defaults to `medium`.
- Flow labels and aux names must not collide.
- Connectors may target stock IDs, cloud IDs, aux IDs, or flow labels.
- Multi-source `aux` and `connector` declarations produce one connector per source.
- Groups may contain stocks and aux nodes, not clouds.
- Groups cannot be nested.
- `@include` may load same-type `.sd` files from the opened project folder.
- Included files contribute only display defaults (`@theme`, `@orientation`, `@size`, `@legend`, `@show-ids`); stocks, clouds, flows, connectors, groups, positions, and nested includes are invalid inside included files.

## Rendering

| Element | Visual |
|---|---|
| stock | rectangle |
| cloud | Forrester cloud outline |
| flow | pipe with valve |
| aux | circle |
| connector | curved dashed arrow |

Negative polarity is rendered red. Polarity labels are bold and visible on flows and connectors.

## Valid Example

```text
@name Population Dynamics
@theme tokyo

stock Population
cloud Births [source]
cloud Deaths [sink]

flow Births -> Population : birth_rate (+) strong
flow Population -> Deaths : death_rate (-) weak

aux carrying_capacity <- Population (-)
connector birth_rate <- Population (+)
```

## Invalid Cases

- unknown flow endpoint
- missing polarity
- invalid polarity token
- duplicate stock/aux/flow-label collision
- group containing a cloud
- unclosed or nested group

## Required Tests

- parser tests for every element type
- invalid syntax tests with useful errors
- fixture tests for simple and grouped models
- renderer or geometry tests when Forrester shapes or edge routing change
