/**
 * Created by Chamberlain on 8/24/2017.
 */
const nodemailer = require('nodemailer');
const NODEMAILER = $$$.env.ini.NODEMAILER;

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
	host: NODEMAILER.HOST,
	port: NODEMAILER.PORT,
	secure: NODEMAILER.SECURE==1, // secure:true for port 465, secure:false for port 587
	auth: {
		user: NODEMAILER.USERNAME,
		pass: NODEMAILER.PASSWORD
	}
});

const defaultFrom = `${NODEMAILER.DEFAULT_FROM_NAME} <${NODEMAILER.DEFAULT_FROM_EMAIL}>`;

module.exports = {
	sendEmail(to, subject, content, params) {
		if(!params) params = {};

		let mailOptions = _.extend({
			from: defaultFrom,
			to:to,
			subject:subject,
			html:content
		}, params);

		//info.messageId, info.response
		return transporter.sendMail(mailOptions);
	}
};
