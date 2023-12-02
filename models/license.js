const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    info: {
        type: String,
        required: true,
    },
    pending: {
        type: Boolean,
        required: true,
    }
});

const License = mongoose.model('License', licenseSchema);

module.exports = License;
