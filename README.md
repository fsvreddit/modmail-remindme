This app, inspired by RemindMeBot, allows you to set reminders in Modmail using a simple command. This can be useful in case you need to follow up on a modmail at a future date or time.

## Setting reminders

In modmail, use the command `RemindMe!`, `!remind` or `!remindme`, with the period specified e.g.

* `RemindMe! 1 day`
* `RemindMe! 2 weeks`
* `RemindMe! 6 months`

Intervals supported are `minute`, `hour`, `day`, `week`, `month` and `year`. If you don't specify an interval, then the app assumes days.

If an existing reminder for the modmail thread already exists, it will be replaced with the new one.

You can put additional text in the modmail message that contains the command too, if you want to put a note in about *why* you are setting the reminder.

If more than one command is found in the message, only the first one will be processed.

## Cancelling reminders

Use the same command with "cancel" after e.g. `RemindMe! cancel`.

## Change History

### v1.0

Initial release

## About this app

This app is open source under the BSD 3-Clause licence. The source code can be found [here](https://github.com/fsvreddit/modmail-remindme).
