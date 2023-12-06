var express = require('express');
var app = express()
var router = express.Router();
var User = require('../models/user');
var License = require('../models/license');
var {Dataset} = require('../models/dataset');
const path = require('path');
var fs = require('fs');
const {upload} = require('../server');
const { getDOIsFromPDF } = require('../utils/pdfUtils');

// get registration page
router.get('/', function (req, res, next) {
	return res.render('index.ejs');
});

// register a user
router.post('/', function (req, res, next) {
	console.log(req.body);
	var personInfo = req.body;


	if (!personInfo.email || !personInfo.username || !personInfo.password || !personInfo.passwordConf) {
		res.send();
	} else {
		if (personInfo.password == personInfo.passwordConf) {

			User.findOne({ email: personInfo.email }, function (err, data) {
				if (!data) {
					var c;
					User.findOne({}, function (err, data) {

						if (data) {
							console.log("if");
							c = data.unique_id + 1;
						} else {
							c = 1;
						}

						var newPerson = new User({
							unique_id: c,
							email: personInfo.email,
							username: personInfo.username,
							password: personInfo.password,
							passwordConf: personInfo.passwordConf
						});

						newPerson.save(function (err, Person) {
							if (err)
								console.log(err);
							else
								console.log('Success');
						});

					}).sort({ _id: -1 }).limit(1);
					res.send({ "Success": "You are regestered,You can login now." });
				} else {
					res.send({ "Success": "Email is already used." });
				}

			});
		} else {
			res.send({ "Success": "password is not matched" });
		}
	}
});

// get login page
router.get('/login', function (req, res, next) {
	return res.render('login.ejs');
});

// allow user to login
router.post('/login', function (req, res, next) {
	const { email, password } = req.body;

	User.findOne({ email: email }, function (err, data) {
		if (data) {
			if (data.password == password) {
				req.session.userId = data.unique_id;
				res.send({ "Success": "Success!" });
			} else {
				res.send({ "Success": "Wrong password!" });
			}
		} else {
			res.send({ "Success": "This Email Is not registered!" });
		}
	});
});

// function that protects all routes after the login page
function isAuthenticated(req, res, next) {
	if (req.session && req.session.userId) {
		next();
	} else {
		res.redirect('/login');
	}
}

// get the user dashboard page
router.get('/profile', isAuthenticated, async (req, res) => {
	User.findOne({ unique_id: req.session.userId }, async function (err, data) {
		console.log(data);
		if (!data) {
			res.redirect('/');
		} else if (data.email === 'admin@gmail.com' && data.password === 'admin') {
			const License = require('../models/license');
			const licenses = await License.find({ pending: true });
			return res.render('admin.ejs', { licenses });
		} else {
			console.log(data);
			return res.render('profile.ejs', { "name": data.username, "email": data.email, alertMessage: req.query.alert });
		}
	});
});

// allow the admin to accept license
router.post('/admin/accept-license/:id', isAuthenticated, async (req, res) => {
	try {
		const licenseId = req.params.id;

		// Update the license's pending status to false
		const License = require('../models/license');
		await License.findByIdAndUpdate(licenseId, { pending: false });

		const licenses = await License.find({ pending: true });
		return res.render('admin.ejs', { licenses });
	} catch (err) {
		console.error('Error accepting license:', err);
		res.status(500).send('Internal Server Error');
	}
});

// allow the admin to deny license
router.post('/admin/deny-license/:id', isAuthenticated, async (req, res) => {
    try {
        const licenseId = req.params.id;

        // Remove the license
        const License = require('../models/license');
        await License.findByIdAndRemove(licenseId);

        const licenses = await License.find({ pending: true });
		return res.render('admin.ejs', { licenses });
    } catch (err) {
        console.error('Error denying license:', err);
        res.status(500).send('Internal Server Error');
    }
});

// logout
router.get('/logout', function (req, res, next) {
	console.log("logout")
	if (req.session) {
		// delete session object
		req.session.destroy(function (err) {
			if (err) {
				return next(err);
			} else {
				return res.redirect('/login');
			}
		});
	}
});

// get forget password page
router.get('/forgetpass', function (req, res, next) {
	res.render("forget.ejs");
});

// change password
router.post('/forgetpass', function (req, res, next) {
	User.findOne({ email: req.body.email }, function (err, data) {
		console.log(data);
		if (!data) {
			res.send({ "Success": "This Email Is not registered!" });
		} else {
			// res.send({"Success":"Success!"});
			if (req.body.password == req.body.passwordConf) {
				data.password = req.body.password;
				data.passwordConf = req.body.passwordConf;

				data.save(function (err, Person) {
					if (err)
						console.log(err);
					else
						console.log('Success');
					res.send({ "Success": "Password changed!" });
				});
			} else {
				res.send({ "Success": "Password does not matched! Both Password should be same." });
			}
		}
	});

});

// get the add dataset form page
router.get('/add-dataset', isAuthenticated, async (req, res) => {
	try {
		// Fetch license names from MongoDB
		const License = require('../models/license');
		const licenses = await License.find({ pending: false }, 'name').exec();

		// Render the 'dataset.ejs' template and pass the 'licenses' data
		res.render('dataset.ejs', { licenses });
	} catch (err) {
		console.error('Error fetching licenses:', err);
		res.status(500).send('Internal Server Error');
	}
});

// add the dataset to mongodb
router.post('/add-dataset', isAuthenticated, upload.single('csvFile'), async (req, res) => {
	try {
		const { name, author, year, license } = req.body;
		const count = 0;

		const License = require('../models/license');
		const { Dataset } = require('../models/dataset');

		const foundLicense = await License.findOne({ name: license }).exec();

		if (!foundLicense) {
			console.log('License not found:', license);
			res.status(400).send('License not found');
			return;
		}

		// Check if file is uploaded
		if (!req.file) {
			res.status(400).send('No file uploaded');
			return;
		}

		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const doiLength = 10;
	
		let doi = 'doi:';
		for (let i = 0; i < doiLength; i++) {
			const randomIndex = Math.floor(Math.random() * characters.length);
			doi += characters.charAt(randomIndex);
		}

		// Create the new dataset with the file name
		const newDataset = new Dataset({
			name: name,
			author: author,
			publicationYear: year,
			fileLink: req.file.originalname,
			count: count,
			license: foundLicense._id,
			doi: doi,
		});
		console.log(newDataset)

		await newDataset.save();


		const localFilePath = path.join(__dirname, '..', 'data', req.file.originalname);
		fs.writeFileSync(localFilePath, req.file.buffer);

		res.redirect('/profile?alert=dsuccess');
	} catch (err) {
		console.error('Error creating dataset:', err);
		res.status(500).send('Internal Server Error');
	}
});

// download the dataset
router.get('/openDataset/:filename', isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'data', filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error opening the file.');
        }
    });
});

// get the custom license form page
router.get('/custom-license', isAuthenticated, async (req, res) => {
	res.render('customLicense.ejs');
})

// send custom license for approval
router.post('/custom-license', isAuthenticated, async (req, res) => {
	try {
		const { name, info } = req.body;
		const pending = true;
		// Create a new custom license object
		const License = require('../models/license');
		const newLicense = new License({
			name,
			info,
			pending,
		});

		// Save the license to the database
		await newLicense.save();

		res.redirect('/profile?alert=lsuccess');
	} catch (err) {
		console.error('Error creating custom license:', err);
		res.status(500).send('Internal Server Error');
	}
});

// get all datasets
router.get('/datasets', isAuthenticated, async (req, res) => {
	try {
		// Retrieve all datasets, populating the 'license' field to get license details
		const { Dataset } = require('../models/dataset');
		const datasets = await Dataset.find().populate('license').exec();
		console.log(datasets);

		res.render("alldatasets.ejs", { datasets });
	} catch (err) {
		console.error('Error loading datasets:', err);
		res.status(500).send('Internal Server Error');
	}
});

// get the add paper form page
router.get('/add-paper', isAuthenticated, async (req, res) => {
	try {
		res.render('paper.ejs');
	} catch (err) {
		console.error('Error fetching research papers:', err);
		res.status(500).send('Internal Server Error');
	}
});

// add the paper to mongodb
router.post('/add-paper', isAuthenticated, upload.single('pdfFile'), async (req, res) => {
    try {
        const { name, author } = req.body;

        // Check if file is uploaded
        if (!req.file) {
            res.status(400).send('No file uploaded');
            return;
        }
		
		const {ResearchPaper} = require('../models/paper');
        // Create the new paper with the file name
        const newPaper = new ResearchPaper({
            name: name,
			author: author,
            fileLink: req.file.originalname,
        });

        await newPaper.save();

        const localFilePath = path.join(__dirname, '..', 'papers', req.file.originalname);
        fs.writeFileSync(localFilePath, req.file.buffer);

        const dois = await getDOIsFromPDF(localFilePath);
		console.log(dois);

        if (dois) {
            await Dataset.updateMany({ doi: { $in: dois } }, { $inc: { count: 1 } });
        }

        res.redirect('/profile?alert=psuccess');
    } catch (err) {
        console.error('Error creating research paper:', err);
        res.status(500).send('Internal Server Error');
    }
});

// get all research papers
router.get('/researchpapers', isAuthenticated, async (req, res) => {
	try {
		// Retrieve all datasets, populating the 'license' field to get license details
		const {ResearchPaper} = require('../models/paper');
		const papers = await ResearchPaper.find().exec();
		console.log(papers);

		res.render("allpapers.ejs", { papers });
	} catch (err) {
		console.error('Error loading papers:', err);
		res.status(500).send('Internal Server Error');
	}
});

// open a research paper
router.get('/openPaper/:filename', isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'papers', filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error opening the file.');
        }
    });
});

module.exports = router;