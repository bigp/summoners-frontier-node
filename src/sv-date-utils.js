/**
 * Created by Chamberlain on 10/3/2017.
 */

const moment = require('moment');

class IntervalChecker {
	constructor(intervalStr, dateStart) {
		const intervalSplit = intervalStr.split(' ');

		this.interval = {
			amount: intervalSplit[0] | 0,
			unit: intervalSplit[1]
		};

		if(dateStart) {
			this.dateStart = _.isString(dateStart) ? moment(dateStart) : dateStart;
		} else {
			this.dateStart = moment(0);
		}
	}

	getValue() {
		const s = this.dateStart;
		const i = this.interval;
		const now = moment();
		const diff = now.diff(s, i.unit);
		const diffSteps = (diff / i.amount);
		const diffCeil = Math.ceil(diffSteps);
		const diffFloor = Math.floor(diffSteps);
		const dateCurrent = s.clone().add(diffFloor * i.amount, i.unit);
		const dateNext = s.clone().add(diffCeil * i.amount, i.unit);

		return {
			steps: diffSteps,
			dateCurrent: dateCurrent,
			dateNext: dateNext
		};
	}
}

module.exports = {
	IntervalChecker: IntervalChecker
};

