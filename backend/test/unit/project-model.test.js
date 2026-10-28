import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Project from '../../src/models/Project.js';
import {
  validateProjectFields,
  parsePaginationParams,
} from '../../src/controllers/project.controller.js';
import { calculateProjectCompatibility } from '../../src/services/matching/compatibilityEngine.js';

describe('Project Model & Controller Helpers - Unit Tests', () => {
  const validBody = {
    title: 'Autonomous Drone Navigation System',
    description:
      'Designing an onboard visual odometry system using ROS2 and OpenCV for GPS-denied student competition environments.',
    requiredSkills: [
      { name: 'C++', minLevel: 4 },
      { name: 'ROS2', minLevel: 3 },
    ],
    timeSlots: ['tue_evening', 'thu_evening'],
    goals: ['competition', 'portfolio'],
    timeline: '4 months',
    workingStyle: 'synchronous',
    relevantSubjects: ['Robotics', 'Computer Vision'],
    preferredLearningStyle: 'hands_on',
    status: 'open',
  };

  describe('1. validateProjectFields', () => {
    it('passes on valid full project payload', () => {
      assert.equal(validateProjectFields(validBody, false), null);
    });

    it('rejects non-object request bodies', () => {
      assert.equal(
        validateProjectFields('string', false),
        'Request body must be a valid JSON object'
      );
      assert.equal(
        validateProjectFields(null, false),
        'Request body must be a valid JSON object'
      );
      assert.equal(
        validateProjectFields([], false),
        'Request body must be a valid JSON object'
      );
    });

    it('rejects unexpected properties including ownerId, _id, and timestamps', () => {
      assert.match(
        validateProjectFields({ ...validBody, ownerId: '123' }, false),
        /Unexpected property in request body: ownerId/
      );
      assert.match(
        validateProjectFields({ ...validBody, _id: '123' }, false),
        /Unexpected property in request body: _id/
      );
      assert.match(
        validateProjectFields({ ...validBody, createdAt: '2026-01-01' }, false),
        /Unexpected property in request body: createdAt/
      );
      assert.match(
        validateProjectFields({ ...validBody, arbitraryField: 'bad' }, false),
        /Unexpected property in request body: arbitraryField/
      );
    });

    it('rejects missing required fields on POST', () => {
      const copy = { ...validBody };
      delete copy.title;
      assert.equal(validateProjectFields(copy, false), 'Missing required field: title');
    });

    it('rejects empty payload on PATCH', () => {
      assert.equal(
        validateProjectFields({}, true),
        'At least one field must be provided for update'
      );
    });

    it('validates title constraints', () => {
      assert.match(
        validateProjectFields({ ...validBody, title: 'abc' }, false),
        /title must be between 5 and 100 characters/
      );
      assert.match(
        validateProjectFields({ ...validBody, title: 'A'.repeat(101) }, false),
        /title must be between 5 and 100 characters/
      );
      assert.match(
        validateProjectFields({ ...validBody, title: 12345 }, false),
        /title must be a string/
      );
    });

    it('validates description constraints', () => {
      assert.match(
        validateProjectFields({ ...validBody, description: 'Short' }, false),
        /description must be between 20 and 2000 characters/
      );
      assert.match(
        validateProjectFields({ ...validBody, description: 12345678901234567890 }, false),
        /description must be a string/
      );
    });

    it('validates requiredSkills constraints', () => {
      assert.match(
        validateProjectFields({ ...validBody, requiredSkills: 'not an array' }, false),
        /requiredSkills must be an array of skill requirements/
      );
      assert.match(
        validateProjectFields(
          { ...validBody, requiredSkills: [{ minLevel: 3 }] },
          false
        ),
        /Each required skill must have a non-empty name/
      );
      assert.match(
        validateProjectFields(
          { ...validBody, requiredSkills: [{ name: 'C++', minLevel: 6 }] },
          false
        ),
        /Each required skill must have an integer minLevel between 1 and 5/
      );
      assert.match(
        validateProjectFields(
          { ...validBody, requiredSkills: [{ name: 'C++', minLevel: 0 }] },
          false
        ),
        /Each required skill must have an integer minLevel between 1 and 5/
      );
      assert.match(
        validateProjectFields(
          { ...validBody, requiredSkills: [{ name: 'C++', minLevel: 2.5 }] },
          false
        ),
        /Each required skill must have an integer minLevel between 1 and 5/
      );
      assert.match(
        validateProjectFields(
          {
            ...validBody,
            requiredSkills: [{ name: 'C++', minLevel: 3, hack: 'injection' }],
          },
          false
        ),
        /Unexpected property in required skill: hack/
      );
    });

    it('validates timeSlots and goals as string arrays', () => {
      assert.match(
        validateProjectFields({ ...validBody, timeSlots: [123] }, false),
        /timeSlots must be an array of string slot identifiers/
      );
      assert.match(
        validateProjectFields({ ...validBody, timeSlots: 'not array' }, false),
        /timeSlots must be an array of string slot identifiers/
      );
      assert.match(
        validateProjectFields({ ...validBody, goals: null }, false),
        /goals cannot be null/
      );
      assert.match(
        validateProjectFields({ ...validBody, goals: [123] }, false),
        /goals must be an array of string tags/
      );
      assert.match(
        validateProjectFields({ ...validBody, goals: 'not array' }, false),
        /goals must be an array of string tags/
      );
    });

    it('validates timeline length', () => {
      assert.match(
        validateProjectFields({ ...validBody, timeline: '' }, false),
        /timeline must be a non-empty string up to 100 characters/
      );
      assert.match(
        validateProjectFields({ ...validBody, timeline: 'A'.repeat(101) }, false),
        /timeline must be a non-empty string up to 100 characters/
      );
      assert.match(
        validateProjectFields({ ...validBody, timeline: 100 }, false),
        /timeline must be a non-empty string up to 100 characters/
      );
    });

    it('validates workingStyle and status enums', () => {
      assert.match(
        validateProjectFields({ ...validBody, workingStyle: 'invalid_style' }, false),
        /workingStyle must be one of: synchronous, asynchronous, mixed/
      );
      assert.match(
        validateProjectFields({ ...validBody, status: 'invalid_status' }, false),
        /status must be one of: open, closed/
      );
    });

    it('validates relevantSubjects and preferredLearningStyle optional fields', () => {
      assert.match(
        validateProjectFields({ ...validBody, relevantSubjects: 'not-an-array' }, false),
        /relevantSubjects must be an array of string subject names/
      );
      assert.match(
        validateProjectFields({ ...validBody, relevantSubjects: [123] }, false),
        /relevantSubjects must be an array of string subject names/
      );
      assert.match(
        validateProjectFields({ ...validBody, preferredLearningStyle: 'unknown_style' }, false),
        /preferredLearningStyle must be one of/
      );
      assert.equal(
        validateProjectFields(
          { ...validBody, relevantSubjects: ['Distributed Systems'], preferredLearningStyle: 'visual' },
          false
        ),
        null
      );
    });
  });

  describe('2. parsePaginationParams', () => {
    it('provides default page 1 and limit 20 when omitted', () => {
      assert.deepEqual(parsePaginationParams({}), { page: 1, limit: 20 });
    });

    it('parses valid positive integer query params', () => {
      assert.deepEqual(parsePaginationParams({ page: '3', limit: '15' }), {
        page: 3,
        limit: 15,
      });
      assert.deepEqual(parsePaginationParams({ page: '1', limit: '50' }), {
        page: 1,
        limit: 50,
      });
    });

    it('rejects invalid page values', () => {
      assert.match(
        parsePaginationParams({ page: '0' }).error,
        /page must be a positive integer/
      );
      assert.match(
        parsePaginationParams({ page: '-1' }).error,
        /page must be a positive integer/
      );
      assert.match(
        parsePaginationParams({ page: 'abc' }).error,
        /page must be a positive integer/
      );
      assert.match(
        parsePaginationParams({ page: '1.5' }).error,
        /page must be a positive integer/
      );
    });

    it('rejects invalid limit values', () => {
      assert.match(
        parsePaginationParams({ limit: '0' }).error,
        /limit must be an integer between 1 and 50/
      );
      assert.match(
        parsePaginationParams({ limit: '51' }).error,
        /limit must be an integer between 1 and 50/
      );
      assert.match(
        parsePaginationParams({ limit: '-1' }).error,
        /limit must be an integer between 1 and 50/
      );
      assert.match(
        parsePaginationParams({ limit: 'xyz' }).error,
        /limit must be an integer between 1 and 50/
      );
    });
  });

  describe('3. Model Methods & Matching Engine Integration', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const project = new Project({
      title: 'Fullstack Microservices Mesh',
      description: 'Implementing an educational service mesh with observability and distributed tracing.',
      ownerId,
      requiredSkills: [
        { name: 'TypeScript', minLevel: 4 },
        { name: 'Kubernetes', minLevel: 3 },
      ],
      timeSlots: ['mon_evening', 'wed_evening'],
      goals: ['portfolio', 'learning'],
      timeline: 'Semester',
      workingStyle: 'mixed',
      relevantSubjects: ['Distributed Systems', 'Cloud Computing'],
      preferredLearningStyle: 'hands_on',
      status: 'open',
    });

    it('toSafeObject returns sanitized document with extended optional fields', () => {
      const safe = project.toSafeObject();
      assert.equal(safe.id, project._id.toString());
      assert.equal(safe.ownerId, ownerId.toString());
      assert.equal(safe.title, 'Fullstack Microservices Mesh');
      assert.deepEqual(safe.requiredSkills, [
        { name: 'TypeScript', minLevel: 4 },
        { name: 'Kubernetes', minLevel: 3 },
      ]);
      assert.deepEqual(safe.timeSlots, ['mon_evening', 'wed_evening']);
      assert.deepEqual(safe.goals, ['portfolio', 'learning']);
      assert.equal(safe.timeline, 'Semester');
      assert.equal(safe.workingStyle, 'mixed');
      assert.deepEqual(safe.relevantSubjects, ['Distributed Systems', 'Cloud Computing']);
      assert.equal(safe.preferredLearningStyle, 'hands_on');
      assert.equal(safe.status, 'open');
      assert.equal(safe._id, undefined);
      assert.equal(safe.__v, undefined);
      assert.equal(safe.password, undefined);
    });

    it('toMatchingEnginePayload produces valid contract for calculateProjectCompatibility', () => {
      const projectPayload = project.toMatchingEnginePayload();

      assert.deepEqual(projectPayload.relevantSubjects, ['Distributed Systems', 'Cloud Computing']);
      assert.equal(projectPayload.preferredLearningStyle, 'hands_on');
      assert.equal(projectPayload.learningStyle, 'hands_on');

      const candidateStudent = {
        skills: [
          { name: 'TypeScript', level: 5 },
          { name: 'Kubernetes', level: 3 },
        ],
        timeSlots: ['mon_evening', 'wed_evening'],
        goals: ['portfolio'],
        timeline: 'Semester',
        workingStyle: 'mixed',
        learningStyle: 'hands_on',
        academicBackground: {
          degree: 'B.S.',
          branch: 'Computer Science',
          yearOfStudy: 3,
          relevantSubjects: ['Distributed Systems', 'Operating Systems'],
        },
        previousProjects: [
          {
            title: 'K8s Cluster',
            skills: ['Kubernetes', 'TypeScript'],
          },
        ],
      };

      const result = calculateProjectCompatibility(projectPayload, candidateStudent);

      assert.equal(result.status, 'calculated');
      assert.ok(typeof result.score === 'number');
      assert.ok(result.score > 80);
      assert.equal(result.factors.length, 6);
      assert.ok(result.reasons.length >= 3);
    });
  });
});
