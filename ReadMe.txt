The invoice.paid event is called when a subscription is paid.

const newEndDate = invoice.lines.data[0].period.end;

End date can be fetched like this then add one hour onto it and store it in the database.