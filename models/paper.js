const mongoose = require('mongoose');

const ResearchPaperSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    fileLink: {
        type: String,
        required: true,
    }
});

const ResearchPaper = mongoose.model('ResearchPaper', ResearchPaperSchema);

module.exports = {ResearchPaper};