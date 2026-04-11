# Information Flow Diagram Specification

## Purpose

The Information Flow Diagram is intended for IT Architects and Information Architects to document how business data moves across systems and how that data changes in meaning or role as it moves.

This diagram type is distinct from a System Integration Diagram.

- A **System Integration Diagram** shows how systems communicate technically.
- An **Information Flow Diagram** shows how information is owned, copied, transformed, enriched, and aggregated across systems.

The Information Flow Diagram is concerned primarily with **data semantics and data role**, not transport mechanics.

Typical questions answered by this diagram:

- Which system is the authoritative source for a given data set?
- Which systems hold replicas?
- Which systems hold derived data?
- Which systems hold aggregates?
- Which systems merge or enrich data from multiple sources?
- How does information move through the landscape?
- Which stores are operational, analytical, or presentation-oriented?

---


## Diagram Type

```text
@type infoflow
```

This declares that the diagram uses the Information Flow Diagram grammar and rendering rules.
The file extension for this file type is .iff
---

## Conceptual Model

An Information Flow Diagram consists of:

- metadata
- stores (nodes)
- groups
- links
- optional position metadata

The main semantic objects are:

- **stores** that hold or publish business data
- **links** that describe the informational relationship between them

---

## Core Semantics

### Node semantics

Each node represents a system, store, or data-holding component with a defined informational role.

The key distinction is not deployment technology, but **data role**.

Recommended core roles:

- `master`
- `replica`
- `derived`
- `aggregate`
- `golden`
- `reference`
- `consumer`

### Link semantics

Each link represents an information relationship.

Core relationship types:

- `replicate`
- `publish`
- `ingest`
- `derive`
- `aggregate`
- `enrich`
- `merge`
- `serve`

The relationship keyword describes the informational meaning of the movement. Technical protocol belongs in the optional transport bracket.

---

## Node Declaration

### Basic form

```text
store <id> [<role>]
```

Example:

```text
store CustomerMaster [master]
store CustomerSearch [replica]
store DailySales [aggregate]
store RiskProfile [derived]
store MDMCustomer [golden]
```

### Optional label override

```text
store <id> [<role>] [label:"Human Readable Label"]
```

Example:

```text
store CustMDM [golden] [label:"Customer MDM"]
```

### Optional subtype

A later extension may allow optional node subtypes such as:

- `system`
- `database`
- `event-store`
- `view`
- `report-store`

But the initial version should keep the node vocabulary simple.

Recommended initial approach:

- use one keyword: `store`
- use role and optional label to carry meaning

This avoids overcomplicating the first version.

---

## Roles

| Role        | Explanation                                                                                                                              |
|-------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `master`    | Authoritative source for a defined data set. Typical meaning: system of record, master system, authoritative operational owner.          |
| `replica`   | Non-authoritative copy of source data. Typical meaning: CDC copy, read replica, downstream copy.                                         |
| `derived`   | Data created by transformation, enrichment, reshaping, filtering, or calculation from source data.                                       |
| `aggregate` | Data created by summarisation or roll-up. Typical meaning: daily totals, KPI store, reporting summary, periodic balance view.            |
| `golden`    | Consolidated mastered record assembled from multiple sources. Typical meaning: MDM golden record, matched and merged entity hub.         |
| `reference` | Shared lookup or classification data. Typical meaning: country codes, currency tables, product classifications, common reference values. |
| `consumer`  | A read-oriented store or system whose role is mainly to serve information onward rather than own it. Backend for Frontend type.          |

### Visual guidance by role

| Role        | Suggested visual treatment                    |
|-------------|-----------------------------------------------|
| `master`    | Strong solid border, full or saturated fill   |
| `replica`   | Lighter fill than master, normal solid border |
| `derived`   | Distinct colour family from master/replica    |
| `aggregate` | Distinct colour family from derived           |
| `golden`    | Premium or highlighted style                  |
| `reference` | Neutral or muted style                        |
| `consumer`  | Neutral read-oriented style                   |

---

## Link Declaration

### Basic form

```text
link <from> -> <to> : <relationship>
```

Example:

```text
link CustomerMaster -> CustomerSearch : replicate
link PaymentEvents  -> DailySales     : aggregate
link CRM            -> RiskProfile    : derive
link CRM            -> MDMCustomer    : merge
```

### Allowed Relationship Values

The following relationship values are reserved semantic keywords in version 1.

| Relationship | Explanation                                                                                                                                                                                                                               |
|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `replicate`  | Copy the same data from a source store to a target store without changing its structure. The target is a non-authoritative copy, often created through CDC, replication jobs, or event propagation.                               |
| `publish`    | Emit business data or events from a source so that other stores or systems can consume them. This describes outward publication of information, typically to an event stream or shared feed.                                              |
| `ingest`     | Receive data or events into a target store from an external source, stream, or upstream system. This describes the receiving side of a publish/consume pattern.                                                                           |
| `derive`     | Create new data in the target by calculating, reshaping, filtering, or otherwise transforming source data into a different informational form. The target is not a simple copy; it contains data inferred or constructed from the source. |
| `aggregate`  | Create summarised or rolled-up data in the target from more detailed source data. Typical examples are daily totals, KPIs, counts, balances, and periodic summaries.                                                                      |
| `enrich`     | Add complementary data to a target by combining source data with additional context, attributes, or reference information. The result is more complete than the original source alone.                                                    |
| `merge`      | Combine overlapping records or data sets from multiple sources into a consolidated target. This is commonly used for mastering, matching, and golden-record creation.                                                                     |
| `serve`      | Expose or deliver data from a store to a read-oriented target whose purpose is presentation, lookup, or downstream consumption rather than ownership or transformation.                                                                   |

### Guidance on distinctions

- Use `replicate` when the target is essentially the same data as the source, only copied elsewhere.
- Use `derive` when the target contains transformed or calculated data that is no longer a simple copy.
- Use `aggregate` when the target contains summaries or rollups of lower-level data.
- Use `enrich` when the target adds extra attributes or context from additional sources.
- Use `merge` when the target consolidates overlapping records from multiple sources into one combined representation.
- Use `publish` and `ingest` when you want to describe the producer side and consumer side of the same information movement explicitly.
- Use `serve` when the target is mainly a presentation, lookup, or delivery-oriented store.

### Examples

| Relationship | Example                                                                              |
|--------------|--------------------------------------------------------------------------------------|
| `replicate`  | CRM → SearchIndex: customer profile copied via CDC                                   |
| `publish`    | OrderService → EventStream: order-created event emitted                              |
| `ingest`     | EventStream → EventStore: events loaded into an event store                          |
| `derive`     | CRM → RiskProfile: risk category calculated from customer attributes                 |
| `aggregate`  | EventStore → DailySales: daily sales totals computed                                 |
| `enrich`     | CRM + ReferenceData → CustomerView: customer record augmented with segment labels    |
| `merge`      | CRM + Billing + Support → MDMHub: consolidated golden customer record                |
| `serve`      | CustomerSummary → PortalCache: read-optimised data delivered for user-facing queries |

### Optional transport bracket

An optional transport bracket may follow the relationship keyword. It is free-form text — not a fixed enum — so any technology name is valid:

```text
link <from> -> <to> : <relationship> [<transport>]
```

Examples:

```text
link CustomerMaster -> CustomerSearch : replicate [cdc]
link OrderSvc       -> EventStore     : publish   [kafka]
link EventStore     -> DailySales     : aggregate [batch]
link LandingZone    -> DataWarehouse  : ingest    [file]
```

The transport label is rendered alongside the relationship on the diagram. It should describe the mechanism of movement, not the semantic meaning — that belongs in the relationship keyword.

This allows technical detail to be included without letting it dominate the diagram type.

---

## Groups

Groups visually cluster related nodes.

### Syntax

```text
group <id> <label> [label:upper-left|upper-right|lower-left|lower-right]
  store ...
  store ...
end
```

Example:

```text
group domain_customer Customer Domain [label:upper-right]
  store CRM            [master]
  store CustomerSearch [replica]
  store MDMCustomer    [golden]
end
```

### Semantics

Groups should represent one of the following:

- business domain
- bounded context
- reporting area
- ownership area
- platform area, if relevant

For Information Flow Diagrams, the preferred use is **domain or ownership grouping**, not infrastructure grouping.

Nested groups should initially be disallowed unless there is a strong reason to support them later.

---

## Visual Language

### Role-based styling

The primary colour language should reflect informational role, not cloud platform.

Suggested default colour mapping:

| Role | Suggested colour family |
|---|---|
| `master` | strong blue |
| `replica` | pale blue |
| `derived` | green |
| `aggregate` | purple |
| `golden` | gold or amber |
| `reference` | grey-blue |
| `consumer` | neutral grey |

Exact colours can be refined later.

### Node appearance

- rounded rectangles for stores by default
- optional future support for shape variants
- labels should normally appear inside the node
- long labels may wrap

### Border usage

Border style may communicate lifecycle state if needed:

- solid = current
- thick = new
- dotted = changing
- greyed/dotted = decommissioning

However, lifecycle state is secondary in this diagram type. Informational role must remain the primary visual signal.

---

## Optional Lifecycle State

If retained from the existing integration diagram approach, allow optional state markers:

- `[new]`
- `[changing]`
- `[decommissioned]`

Example:

```text
store CustomerSummary [aggregate] [new]
```

This should be supported, but visually subordinate to informational role.

---

## Position Metadata

Positions are stored separately from logical definitions.

### Syntax

```text
@position <id> <x> <y>
```

Example:

```text
@position CustomerMaster 120 160
@position CustomerSearch 420 160
@position DailySales 420 360
```

The renderer must never treat these coordinates as part of semantic interpretation. They are purely presentation metadata.

---

## Example Diagram

```text
@type     infoflow
@name     Customer Information Landscape
@version  1.0
@author   Jane Smith
@date     2026-04-11
@theme    light

group customer_domain Customer Domain [label:upper-right]
store CRM             [master]
store SearchIndex     [replica]
store MDMHub          [golden]
end

group analytics Analytics [label:upper-right]
store EventStore      [derived]
store CustomerSummary [aggregate]
store RiskProfile     [derived]
end

link CRM             -> SearchIndex     : replicate [cdc]
link CRM             -> EventStore      : publish   [kafka]
link CRM             -> MDMHub          : merge
link EventStore      -> CustomerSummary : aggregate [batch]
link CRM             -> RiskProfile     : enrich
link MDMHub          -> RiskProfile     : enrich
link CustomerSummary -> RiskProfile     : derive

@position CRM             140 180
@position SearchIndex     400 180
@position MDMHub          140 340
@position EventStore      650 180
@position CustomerSummary 650 340
@position RiskProfile     900 260
```

---

## Version 1 Scope — Implemented

Version 1 is complete. It includes:

- `@type infoflow`
- metadata directives (`@name`, `@version`, `@date`, `@author`, `@theme`, `@orientation`, `@size`)
- `store` with role, optional state, optional label override
- `link` with relationship keyword and optional transport bracket
- `group` / `end` blocks with label-corner control
- role-based fill colours across all three themes (dark, light, tokyo)
- lifecycle state reflected in border style
- drag-and-drop layout with `@position` persistence
- draggable metadata box

---

## Non-Goals for Version 1

The following should not be priorities in the first version:

- full BPMN-like process modelling
- full DFD process/store/entity semantics
- nested groups
- rich expression grammar on links
- automatic layout sophistication
- modelling technical protocols as the primary meaning

This diagram type is not a replacement for sequence diagrams, BPMN, or classical DFD. It is a focused architecture view for information ownership and information movement.

---

## Relationship to Other Diagram Types

### System Integration Diagram

Focus:

- systems
- databases
- queues
- protocols
- sync vs async
- lifecycle state
- infrastructure/platform grouping

### Information Flow Diagram

Focus:

- mastership
- replication
- derivation
- aggregation
- enrichment
- lineage
- semantic movement of business data

These are related but distinct views and should remain separate diagram types.

---

## Open Design Questions

These questions were resolved during implementation:

1. **Store keyword** — resolved: `store`
2. **`master` vs `sor`** — resolved: `master`
3. **`golden` in v1** — resolved: yes, included
4. **Shape variants** — resolved: not in v1; all stores are rounded rectangles
5. **Semantic + technical label on links** — resolved: relationship keyword for semantics, optional `[transport]` bracket for technical detail
6. **Groups represent domains or platforms** — resolved: domains and ownership areas by default

---

## Status

This specification is fully implemented in Tegne as `@type infoflow`. The fixture `fixtures/customer_information.iff` provides a canonical example. Parser validation rules are in `src/iff/parser.ts`.
