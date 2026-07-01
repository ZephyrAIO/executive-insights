# Filters

## Filter types
* Field Filter
* Hierarchy Filter

## Filter sections
dashboard-level - position above the widget grid container
widget-level - positioned at the top of the widget

## Field Filter UI 
popover
    Popover Trigger - 
        label <-> chevron
        label conditions:
            default = fieldName
            if 1 selection = field option qText
            if multiple selections = fieldName ({selections.length})
    Popover Content
        field search
            search icon
            placeholder = "Search {fieldName}
        field options list
            option qText <-> Checkbox

## Hierarchy Filter UI
popover
    Popover Trigger - 
        label <-> chevron
        label conditions:
            default = hierarchy.name
            if 1 selection = field option qText (hierarchy priority)
                field 1 has 1 selection & field 2 has 2 selection = field 2 name (2)
                field 1 has 2 selection & field 2 has 1 selection = field option qtext
            if selections = hierarchy.name ({selections.length})
    Popover Content
        field search
            search icon
            placeholder = "Search {...fieldNames}"
        Collapsible trigger (per hierarchy field)
            label <-> chevron
            label conditions:
                default = fieldName
                if multiple selections = fieldName ({selections.length})
        Collapsible content (per hierarchy field)
            field options list
                option qText <-> Checkbox

## Popover UI
Trigger
    200px width
    30px height
Container
    300px width
    400px max height
    overflow auto
Hierarchy field lists
    300px max height
    overflow auto
Ordering
    field option lists must not reorder while their popover is open, including after selection and Qlik changed events
    selected-first reordering should happen only after the popover closes, so the next open renders in the correct order

## Qlik Capability API
Qlik field option styling
qState 'S' - Selected
qState 'O' - Open
qState 'A' - Alternative
qState 'X' - Closed


Qlik Sense Capability API:
https://help.qlik.com/en-US/sense-developer/May2026/Subsystems/APIs/Content/Sense_ClientAPIs/CapabilityAPIs/AppAPI/createList-method.htm
https://help.qlik.com/en-US/sense-developer/May2026/Subsystems/EngineJSONAPI/Content/models-listobjectdef.htm
https://help.qlik.com/en-US/sense-developer/May2024/Subsystems/EngineJSONAPI/Content/service-genericobject-searchlistobjectfor.htm
https://help.qlik.com/en-US/sense-developer/May2024/Subsystems/EngineJSONAPI/Content/service-genericobject-abortlistobjectsearch.htm
https://help.qlik.com/en-US/sense-developer/May2026/Subsystems/NetSDKAPIref/Content/Qlik.Engine.DataPager.Changed.htm

DO USE THESE EXAMPLES:
DEFAULT_BATCH_SIZE = 20;
LIST_PATH = "/qListObjectDef";
const buildListDefinition = (fieldName, batchSize) => ({
    qDef: {
        qFieldDefs: [FieldName],
        qSortCriteria: [
            {
                qSortByState: 1,
                qSortByFrequency: 0,
                qSortByNumeric: 1,
                qSortByAscii: 1,
                qSortByLoadOrder: 0,
                qSortByExpression: 0
            }
        ]
    },
    qShowAlternatives: true,
    qInitionDataFetch: [
        {
            qTop: 0,
            qLeft: 0,
            qHeight: batchSize,
            qWidth: 1
        }
    ]
});
listObject = app.createList(buildListDefinitions(fieldName, batchSize))
listObject.on("changed", handleChange);
listObject.removeListener("changed", handleChange);
listObject.removeAllListeners("changed"); // alternative
listObject.searchListObjectFor(LIST_PATH, string);
listObject.abortListObjectSeach(LIST_PATH);

field = app.field(fieldName);
field.selectValues([], true, true);

NO NOT:
create session objects
use different methods without asking


## caching
Provide intuitive suggestions here.
Primarily I'm after listObject caching and request inflight handling.

## Data flows
Dashboard-level filter data flow:
Dashboard-level filters read the core-qlik-application-id value from the settings endpoint to use as the qlik appId to render the field data.
Dashboard-level filters write to every qlik application of the dashboard

Widget-level filter data flow:
Widget-level filters read the qlik appId from the widget to render the field data.
Widget level filters write to the qlik appId from the widget.

On field option selection apply the values, show optimistic UI, show loading indicator.
Opening or closing a filter can refresh loaded field values, but cached option lists stay visible during the refresh. Only show the Loading values placeholder when no values have been loaded yet.

Filter value JSON:
defaultValuesJson stores versioned default selections as { "version": 2, "fields": { "fieldName": { "options": ["value"] } } }.
allowedValuesJson stores versioned presentation and allow-list config as { "version": 2, "fields": { "fieldName": { "fieldLabel": "Label", "options": ["value"], "automaticVisibility": true } } }.

Allowed value behavior:
fieldLabel is used instead of fieldName for presentation.
allowed options are component-specific presentation rules, not shared qlik state. The shared qlik app/field store keeps raw field options so dashboard-level and widget-level filters can share selections while using different allowedValuesJson rules.
if options is omitted or empty, all loaded values for that field are visible.
if options is non-empty, only matching option qText values are visible unless an out-of-list value is selected.
selected out-of-list values stay visible so the user can see and clear them.
allowed options are ordered by the JSON option order within each qState group.
if automaticVisibility is true, a hierarchy field is visible only when the field above it has a selection.
defaults apply on dashboard open and after Clear all.

## Scenarios
When a filter (e.g. field filter - fieldName = Segment) is used for multiple widgets of the same qlik app the data should be synced and they should share the same listObject and state.
On dashboard unmount or change should clear all filters state and qlik with app.clearAll() per app.

 
## layers
Qlik listObject handling
Caching
in flight handling
Shared state (via zustand)
    data,
    search,
    selected,
    loading,
    error
UI (Radix and lucide)
    <HierarchyFilter>
    <FieldFilter>

## features
field option lists should be virtualised using tanstack-virtual and use infinite scrolling
must use existing API endpoints
make conponents reusable
make API simple and ensure separation of concerns is thought about for each layer
Include a useDebounce hook for searching.