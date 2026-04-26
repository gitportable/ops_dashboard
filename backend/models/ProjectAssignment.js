// models/ProjectAssignment.js
const mongoose = require('mongoose');

const projectAssignmentSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // assuming you have User model
  roleInProject: {
    type: String,
    enum: ['lead', 'developer', 'tester', 'viewer'],
    default: 'viewer'
  },
  assignedAt: { type: Date, default: Date.now },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index to prevent duplicate assignments
projectAssignmentSchema.index({ project: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ProjectAssignment', projectAssignmentSchema);