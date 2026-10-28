import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import CollaborationRequest, {
  REQUEST_MODES,
  REQUEST_STATUSES,
} from '../../src/models/CollaborationRequest.js';

describe('CollaborationRequest Model - Unit Tests', () => {
  const requesterId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const projectId = new mongoose.Types.ObjectId();

  describe('1. Model Validation & Constraints', () => {
    it('creates a valid instance for project mode', () => {
      const doc = new CollaborationRequest({
        requesterId,
        recipientId,
        mode: 'project',
        projectId,
        message: 'Looking forward to collaborating on your ROS2 drone project!',
        status: 'pending',
        compatibilitySnapshot: {
          mode: 'project',
          score: 85,
          factors: [{ name: 'skills', label: 'Technical Skills (40%)', weight: 40, score: 90 }],
          reasons: ['Strong alignment on ROS2'],
          calculatedAt: new Date(),
        },
      });

      const err = doc.validateSync();
      assert.equal(err, undefined);
      assert.equal(doc.status, 'pending');
      assert.equal(doc.mode, 'project');
    });

    it('requires projectId when mode is project', () => {
      const doc = new CollaborationRequest({
        requesterId,
        recipientId,
        mode: 'project',
      });

      const err = doc.validateSync();
      assert.ok(err);
      assert.ok(err.errors.projectId);
      assert.match(err.errors.projectId.message, /projectId is required/);
    });

    it('allows omitting projectId for study_buddy and skillswap modes', () => {
      const docStudy = new CollaborationRequest({
        requesterId,
        recipientId,
        mode: 'study_buddy',
      });
      assert.equal(docStudy.validateSync(), undefined);

      const docSwap = new CollaborationRequest({
        requesterId,
        recipientId,
        mode: 'skillswap',
      });
      assert.equal(docSwap.validateSync(), undefined);
    });

    it('rejects invalid mode', () => {
      const doc = new CollaborationRequest({
        requesterId,
        recipientId,
        mode: 'invalid_mode',
      });

      const err = doc.validateSync();
      assert.ok(err);
      assert.ok(err.errors.mode);
      assert.match(err.errors.mode.message, /mode must be one of/);
    });

    it('rejects invalid status', () => {
      const doc = new CollaborationRequest({
        requesterId,
        recipientId,
        mode: 'study_buddy',
        status: 'completed',
      });

      const err = doc.validateSync();
      assert.ok(err);
      assert.ok(err.errors.status);
      assert.match(err.errors.status.message, /status must be one of/);
    });

    it('rejects messages longer than 500 characters', () => {
      const doc = new CollaborationRequest({
        requesterId,
        recipientId,
        mode: 'study_buddy',
        message: 'a'.repeat(501),
      });

      const err = doc.validateSync();
      assert.ok(err);
      assert.ok(err.errors.message);
      assert.match(err.errors.message.message, /cannot exceed 500 characters/);
    });
  });

  describe('2. Serialization via toSafeObject', () => {
    it('serializes unpopulated document safely', () => {
      const doc = new CollaborationRequest({
        _id: new mongoose.Types.ObjectId(),
        requesterId,
        recipientId,
        mode: 'project',
        projectId,
        message: 'Let us build together',
        status: 'pending',
        compatibilitySnapshot: {
          mode: 'project',
          score: 75,
          factors: [{ name: 'skills', label: 'Technical Skills (40%)', weight: 40, score: 75 }],
          reasons: ['Good overlap'],
          calculatedAt: new Date(),
        },
      });

      const safe = doc.toSafeObject();
      assert.equal(safe.id, doc._id.toString());
      assert.equal(safe.requesterId, requesterId.toString());
      assert.equal(safe.requester, undefined);
      assert.equal(safe.recipientId, recipientId.toString());
      assert.equal(safe.recipient, undefined);
      assert.equal(safe.projectId, projectId.toString());
      assert.equal(safe.mode, 'project');
      assert.equal(safe.message, 'Let us build together');
      assert.equal(safe.status, 'pending');
      assert.equal(safe.compatibilitySnapshot.score, 75);
      assert.equal(safe.compatibilitySnapshot.factors.length, 1);
    });

    it('serializes populated user and project documents without leaking private data', () => {
      const populatedRequester = {
        _id: requesterId,
        name: 'Alice Developer',
        email: 'alice@secret.com',
        passwordHash: 'hash123',
      };
      const populatedRecipient = {
        _id: recipientId,
        name: 'Bob Lead',
        email: 'bob@secret.com',
      };
      const populatedProject = {
        _id: projectId,
        title: 'Distributed Systems Study',
        status: 'open',
        ownerId: recipientId,
      };

      const doc = new CollaborationRequest({
        _id: new mongoose.Types.ObjectId(),
        requesterId,
        recipientId,
        mode: 'project',
        projectId,
        message: 'Hello Bob',
        status: 'accepted',
      });

      // Simulate populated refs from Mongoose query
      Object.defineProperty(doc, 'requesterId', { value: populatedRequester });
      Object.defineProperty(doc, 'recipientId', { value: populatedRecipient });
      Object.defineProperty(doc, 'projectId', { value: populatedProject });

      const safe = doc.toSafeObject();
      assert.deepEqual(safe.requester, {
        id: requesterId.toString(),
        name: 'Alice Developer',
      });
      assert.equal(safe.requester.email, undefined);
      assert.deepEqual(safe.recipient, {
        id: recipientId.toString(),
        name: 'Bob Lead',
      });
      assert.deepEqual(safe.project, {
        id: projectId.toString(),
        title: 'Distributed Systems Study',
        status: 'open',
        ownerId: recipientId.toString(),
      });
    });
  });
});
