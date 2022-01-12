# raycast-createEvent
This extension allows to quickly create new events to your calendar! Note that the events are automatically created to the first (i.e. upper-most) calendar in your MacOS Calendar App

## Input Examples
The extension parses your input from natural language, therefore you can create events using expressions like:
- from 12 to 15
- from tomorrow to next friday
- one hour from now
- in 3 hours
- next month

Events should have a *title*, a *starting date/time* and an *ending date/time*. However, whenever one or more of these information are not provided, following default values are adopted:
- Default title: "Event"
- Default starting date/time: the current system's date/time
- Default ending date/time: one hour after the event's starting date/time