This app, inspired by RemindMeBot, allows you to set reminders in Modmail using a simple command. This can be useful in case you need to follow up on a modmail at a future date or time.

## Setting reminders

In modmail, use the command `RemindMe!`, `!remind` or `!remindme`, with the period specified e.g.

* `RemindMe! 1 day`
* `RemindMe! 2 weeks`
* `RemindMe! 6 months`

Intervals supported are `minute`, `hour`, `day`, `week`, `month` and `year`. If you don't specify an interval, then the app assumes days. E.g. `RemindMe! 4` will set a reminder for four days from the time the command is issued.

If an existing reminder for the modmail thread already exists, it will be replaced with the new one.

For convenience, you can put additional text in the modmail message that contains the command too, if you want to put a note in about *why* you are setting the reminder.

If more than one reminder command is found in the message, only the first one will be processed.

The app will reply to your message with a private moderator note confirming that the reminder has been set, and if applicable that the previous reminder was replaced.

## Cancelling reminders

Use the same command with "cancel" after e.g. `RemindMe! cancel`. Again, the app will reply to confirm cancellation.

## Change History

## v1.1.9

* Update Devvit version, improve logging and efficiency

## v1.1.5

* Update Devvit version

## v1.1.4

* Fix issue that could result in reminder commands being processed more than once.

## v1.1

* Add option to send reminders if the account the modmail is about has been deleted, shadowbanned or suspended.

## v1.0.2

* Handle errors sending reminders more gracefully

### v1.0

* Initial release

## About this app

This app is open source under the BSD 3-Clause licence. The source code can be found [here](https://github.com/fsvreddit/modmail-remindme).
