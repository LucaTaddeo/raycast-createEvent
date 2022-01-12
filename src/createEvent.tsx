import { List, ActionPanel, showToast, ToastStyle, closeMainWindow, showHUD, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";

import { runAppleScriptSync } from "run-applescript";
import * as chrono from "chrono-node";

/**
 * This is the core function, defining the extension's functioning
 * @returns the raycast extension view
 */
export default function Command() {
  const { state, parse } = useParseEvent();
  let subtitle = sameDay(state.event.startDate, state.event.endDate)
    ? state.event.startDate.getDay() + " " + state.event.startDate.toLocaleString("default", { month: "long" })
    : "";
  return (
    <List isLoading={state.isLoading} onSearchTextChange={parse} searchBarPlaceholder="Your event..." throttle>
      <List.Section title="New Event" subtitle={subtitle}>
        {state.event && <CalendarItem event={state.event} />}
      </List.Section>
    </List>
  );
}

/**
 * This function runs an applescript script to create the new event in the
 * calendar. It returns a confirmation message after creating the event.
 * @param event the event to be created
 */
async function createEvent(event: Event) {
  runAppleScriptSync(
    'tell application "Calendar" \n tell first calendar \n make new event with properties {summary:"' +
      event.title +
      '", start date: date "' +
      getAppleScriptFriendlyDate(event.startDate) +
      '", end date:  date "' +
      getAppleScriptFriendlyDate(event.endDate) +
      '"} \n end tell \n end tell'
  );

  //closeMainWindow();
  //showHUD("📆 " + event.title + " added to your calendar!");

  popToRoot();
  showToast(
    ToastStyle.Success,
    event.title + " created",
    "From: " + getDateAndTime(event.startDate) + " \nTo: " + getDateAndTime(event.endDate)
  );
}

/**
 * This function creates a listitem corresponding to the calendar event
 * @param param0 the event to be created
 * @returns a ListItem object
 */
function CalendarItem({ event }: { event: Event }) {
  return (
    <List.Item
      title={event.title}
      subtitle={getEventDateString(event.startDate, event.endDate)}
      // TODO: add event's duration as accessoryTitle
      // TODO: add more actions, like checking calendar's availability (?)
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionPanel.Item title="Create Event" onAction={() => createEvent(event)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/**
 * This function uses {@link performParsing} and wraps it by adding a loading state
 * Note: the loading state will probably be never triggered.
 * @returns the state, containing a loading variable and the parsed event
 */
function useParseEvent() {
  const [state, setState] = useState<ParseState>({ event: getDefaultEvent(), isLoading: true });
  useEffect(() => {
    parse("");
    return () => {};
  }, []);

  async function parse(input: string) {
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      const parsedEvent = performParsing(input);
      setState((oldState) => ({
        ...oldState,
        event: parsedEvent,
        isLoading: false,
      }));
    } catch (error) {
      console.error("parsing error", error);
      showToast(ToastStyle.Failure, "Could not parse the string", String(error));
    }
  }

  return {
    state: state,
    parse: parse,
  };
}

/**
 * This function checks if two dates have the same day, month and year
 * @param firstDate a date object
 * @param secondDate a date object
 * @returns true if the dates happen on the same day
 */
function sameDay(firstDate: Date, secondDate: Date): boolean {
  return (
    firstDate.getDate() == secondDate.getDate() &&
    firstDate.getMonth() == secondDate.getMonth() &&
    firstDate.getFullYear() == secondDate.getFullYear()
  );
}

/**
 * This function converts a date object into a date string that can be
 * easily parsed into an applescript date
 * @param date the date object to be parsed
 * @returns a string with format "DD/MM/YYYY, HH:MM:SS"
 */
function getAppleScriptFriendlyDate(date: Date): string {
  return (
    date.getDate() +
    "/" +
    (date.getMonth() + 1) +
    "/" +
    date.getFullYear() +
    ", " +
    date.getHours() +
    ":" +
    (date.getMinutes() < 10 ? "0" : "") +
    date.getMinutes() +
    ":" +
    (date.getSeconds() < 10 ? "0" : "") +
    date.getSeconds()
  );
}

/**
 * Returns a string representing the events start and end date, divided by a hyphen.
 * If the event starts and ends on the same day, this function only returns the start and end time.
 * @param firstDate the event's start date object
 * @param secondDate the event's end date object
 * @returns a string either with the format "HH:MM - HH:MM" or "DD/MM HH:MM - DD/MM HH:MM"
 */
function getEventDateString(firstDate: Date, secondDate: Date): string {
  if (sameDay(firstDate, secondDate)) {
    return getTime(firstDate) + " - " + getTime(secondDate);
  } else {
    return getDateAndTime(firstDate) + " - " + getDateAndTime(secondDate);
  }
}

/**
 * Parses a date object into a time string
 * @param date the date to be parsed
 * @returns a string with the format "HH:MM"
 */
function getTime(date: Date): string {
  return date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
}

/**
 * Parses a date object into a date string
 * @param date the date to be parsed
 * @returns a string with the format "DD/MM"
 */
function getDate(date: Date): string {
  return date.getDate() + "/" + (date.getMonth() + 1);
}

/**
 * Parses a date object into a datetime string
 * @param date the date to be parsed
 * @returns a string with the format "DD/MM HH:MM"
 */
function getDateAndTime(date: Date): string {
  return getDate(date) + " " + getTime(date);
}

/**
 * This function creates a default event. By default, following values are defined:
 * - Title: "Event"
 * - Start Date: the system's current date and time
 * - End Date: one hour after the event's start date
 * @returns a default event object
 */
function getDefaultEvent(): Event {
  let title = "Event";
  let startDate = new Date();
  let endDate = new Date(new Date(startDate).setHours(startDate.getHours() + 1));

  return {
    title: title,
    startDate: startDate,
    endDate: endDate,
  };
}

/**
 * This function is used to clean the event's title, by removing the date string, any
 * date-related keyword and by trimming whitespaces
 */
function getTitle(inputString: string, dateString: string): string {
  let title = inputString.replace(dateString, "");
  title = title.replace("from", "");
  title = title.trim();
  return title;
}

/**
 * This function performs a parsing on an input, in order to extract an event's details.
 * Note that missing fields are filled with default values:
 * - Missing title = event's name is "Event"
 * - Missing start time = event starts now
 * - Missing end time = event ends one hour after the start time
 *
 * Note: if nothing is parsed, a {@link getDefaultEvent default event} is returned.
 * @param input any event, declared with natural language
 * @returns an event object, obtained by parsing title, start and end date from the input
 */
function performParsing(input: string): Event {
  // Create a default event
  let event = getDefaultEvent();

  // Start parsing input
  if (input) {
    const parsed = chrono.parse(input);
    if (parsed.length > 0) {
      // Check for a start date

      if (parsed[0].start) {
        event.startDate = parsed[0].start.date();
        // Check for an end date
        if (parsed[0].end) {
          event.endDate = parsed[0].end.date();
        } else {
          // By default, set end date as start date + 1 hour
          event.endDate = new Date(new Date(parsed[0].start.date().setHours(parsed[0].start.date().getHours() + 1)));
        }
      }
      event.title = getTitle(input, parsed[0].text) || "Event"; // Remove the date string from the input, to obtain the cleaned title
    } else {
      event.title = input; // By default, use the input as title
    }
  }

  return event;
}

interface ParseState {
  event: Event;
  isLoading: boolean;
}

interface Event {
  title: string;
  startDate: Date;
  endDate: Date;
}
