import moment from 'moment';

export function formatNo(no: number) {
    if (no >= 1000000) {
        return (no / 1000000).toFixed(1) + 'M';
    } else if (no >= 1000) {
        return (no / 1000).toFixed(1) + 'K';
    } else {
        return no.toString();
    }
}

export function timeFormatter(Time?: string) {
	if (!Time) {
		return moment().format('MMM D, YYYY h:mm:ss A');
	}
	const date = moment(Time, 'MM/DD/YYYY, h:mm:ss A');
	const formattedDate = date.format('MMM D, YYYY h:mm:ss A');
	return formattedDate;
}

export const Time = (params: string | Date ) => {
	const dateObj = new Date(params);
	
	// Define options for formatting the date
	const options: Intl.DateTimeFormatOptions = {
	  year: 'numeric',
	  month: '2-digit',
	  day: '2-digit',
	  hour: '2-digit',
	  minute: '2-digit',
	  second: '2-digit',
	  hour12: true,
	};
	
	// Format the Date object to the desired format
	const formattedDateStr = dateObj.toLocaleString('en-US', options);
	
	// Print the result
	return formattedDateStr;
}