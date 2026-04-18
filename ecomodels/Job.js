// ============================================================
//  ecomodels/Job.js
//  User job progress — global
// ============================================================
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  jobId:        { type: String, default: null   }, // null = unemployed
  jobName:      { type: String, default: null   },
  jobLevel:     { type: Number, default: 1      }, // level within current job
  worksTotal:   { type: Number, default: 0      }, // total works done in this job
  worksLifetime:{ type: Number, default: 0      }, // all time works across all jobs
  promotions:   { type: Number, default: 0      }, // times promoted
  hiredAt:      { type: Date,   default: null   },
}, { timestamps: true });

module.exports = jobSchema;
