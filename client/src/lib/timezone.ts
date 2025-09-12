// Get the user's timezone identifier (IANA timezone)
export function getUserTimezone(): string {
  try {
    // Use Intl.DateTimeFormat to get the timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (error) {
    // Fallback to UTC if unable to detect timezone
    return "UTC";
  }
}

// Format a date/time in the user's timezone
export function formatInUserTimezone(date: string, time: string, timezone: string): string {
  try {
    // Combine date and time
    const dateTimeStr = `${date}T${time}`;
    const dateObj = new Date(dateTimeStr);
    
    // Format in the specified timezone
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(dateObj);
  } catch (error) {
    // Return original time if formatting fails
    return time;
  }
}