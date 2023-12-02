// models/dataset.js
const mongoose = require('mongoose');

const licenseSchema = require('../models/license')

const datasetSchema = new mongoose.Schema({
  name: String,
  fileLink: String,
  count: Number,
  license: { type: mongoose.Schema.Types.ObjectId, ref: 'License' },
});

const Dataset = mongoose.model('Dataset', datasetSchema);

module.exports = { Dataset };
