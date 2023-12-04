// models/dataset.js
const mongoose = require('mongoose');

const licenseSchema = require('../models/license')

const datasetSchema = new mongoose.Schema({
  name: String,
  author: String,
  publicationYear: Number,
  fileLink: String,
  count: Number,
  license: { type: mongoose.Schema.Types.ObjectId, ref: 'License' },
  doi: String,
});

const Dataset = mongoose.model('Dataset', datasetSchema);

module.exports = { Dataset };
