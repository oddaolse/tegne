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
- **process** that describe actions on data.

---

## Core Semantics
(* ========================================================================== *)
(* TEGNE INFOFLOW DIAGRAM SYNTAX                                             *)
(* Formal Specification in Extended Backus-Naur Form (ISO/IEC 14977)         *)
(* ========================================================================== *)

document = { metadata_directive }
         , { palette_definition }
         , { element }
         ;

(* ========================================================================== *)
(* METADATA DIRECTIVES                                                       *)
(* Declare document properties: name, author, layout, theme                  *)
(* ========================================================================== *)

metadata_directive = "@type" , "infoflow"
                   | "@name" , string
                   | "@version" , version_string
                   | "@author" , string
                   | "@date" , date_string
                   | "@theme" , theme_value
                   | "@size" , paper_size
                   ;

version_string = digit , { "." , digit } ;

date_string = digit , digit , digit , digit , "-" , digit , digit , "-" , digit , digit ;

theme_value = "dark" | "light" | "tokyo" ;

paper_size = "a0" | "a1" | "a2" | "a3" | "a4" ;

(* ========================================================================== *)
(* PALETTE DEFINITIONS                                                       *)
(* Declare visual encodings for location-types, states, systems, flows       *)
(* ========================================================================== *)

palette_definition = location_type_block
                   | store_state_block
                   | system_block
                   | flow_type_block
                   ;

(* Location-types: what each store represents *)
location_type_block = "@location-types" , { location_type_mapping } ;

location_type_mapping = identifier , colour ;

(* Store states: is this store in scope for change? *)
store_state_block = "@store-state" , { store_state_mapping } ;

store_state_mapping = state_name , visual_style ;

state_name = "unchanged" | "changing" | "new" | "decommissioned" ;

visual_style = "solid" | "dashed" | "bold" | "thick" | "x" ;

(* Systems: process grouping and colouring *)
system_block = "@systems" , { system_mapping } ;

system_mapping = identifier , colour ;

(* Flow-types: how data moves (sync/async/batch) *)
flow_type_block = "@flow-types" , { flow_type_mapping } ;

flow_type_mapping = flow_type_name , visual_style ;

flow_type_name = "sync" | "async" | "batch" ;

colour = "blue" | "cyan" | "green" | "purple" | "orange" | "grey"
       | "yellow" | "pink" | "teal" | "red"
       ;

(* ========================================================================== *)
(* ELEMENTS                                                                  *)
(* ========================================================================== *)

element = store_decl
        | process_decl
        | link_decl
        | group_decl
        | position_decl
        ;

(* STORE: persistent data container (database, file, cache, stream) *)
store_decl = "store" , identifier , { store_attribute } ;

store_attribute = "[" , store_attr_value , "]" ;

store_attr_value = location_type_name        (* e.g. "master", "replica" *)
                 | state_name                (* e.g. "changing", "new" *)
                 | label_attr
                 ;

location_type_name = identifier ;

label_attr = "label" , ":" , string ;

(* PROCESS: active component (system, service, application, batch job) *)
process_decl = "process" , identifier , { process_attribute } ;

process_attribute = "[" , process_attr_value , "]" ;

process_attr_value = system_assignment         (* e.g. [system:SystemA] *)
                   | state_name               (* e.g. "changing" *)
                   | label_attr
                   ;

system_assignment = "system" , ":" , identifier ;

(* LINK: data flow relationship between stores and/or processes *)
link_decl = "link" , identifier , "->" , identifier , ":" , relationship_name , [ flow_attr ] ;

relationship_name = identifier ;
(* Semantic examples: replicate, publish, ingest, derive, query, serve, merge *)

flow_attr = "[" , "flow" , ":" , flow_type_name , "]" ;

(* GROUP: logical container for stores and processes *)
group_decl = "group" , identifier , string , [ group_attributes ] , group_body , "end" ;

group_attributes = { group_attribute } ;

group_attribute = "[" , group_attr_value , "]" ;

group_attr_value = system_assignment
                 | corner_attr
                 ;

corner_attr = "corner" , ":" , corner_position ;

corner_position = "upper-left" | "upper-right" | "lower-left" | "lower-right" ;

group_body = { element } ;

(* POSITION: explicit layout coordinates for elements *)
position_decl = "@position" , identifier , number , number ;

(* ========================================================================== *)
(* TOKENS                                                                    *)
(* ========================================================================== *)

identifier = letter , { letter | digit | "_" } ;

string = '"' , { string_char } , '"' ;

string_char = ? any printable character except double-quote ? ;

number = digit , { digit } ;

digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;

letter = "a" | "b" | ... | "z" | "A" | "B" | ... | "Z" ;

(* ========================================================================== *)
(* COMMENTS                                                                  *)
(* ========================================================================== *)

comment = "#" , { ? character except newline ? } ;

(* Whitespace and newlines separate tokens and are otherwise ignored *)