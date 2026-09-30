import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User, Role, getNextSequence } from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/users - List users
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, status, search } = req.query;
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password_hash')
      .sort({ id: 1 })
      .lean();

    return res.json({ users });
  } catch (error: any) {
    console.error('Error fetching users from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// GET /api/users/roles - List available roles
router.get('/roles', async (_req, res) => {
  try {
    const roles = await Role.find().sort({ id: 1 }).lean();
    return res.json({ roles });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve roles.' });
  }
});

// POST /api/users - Admin only: Create a user
router.post('/', authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const validRole = await Role.findOne({ name: role });
    if (!validRole) {
      return res.status(400).json({ error: `Invalid role '${role}'.` });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const nextId = await getNextSequence('users');

    const newUser = await User.create({
      id: nextId,
      name: name.trim(),
      email: cleanEmail,
      password_hash: passwordHash,
      role,
      status: status || 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const userObj = newUser.toObject();
    delete (userObj as any).password_hash;

    return res.status(201).json({
      message: 'User created successfully.',
      user: userObj,
    });
  } catch (error: any) {
    console.error('Error creating user in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id - Update user (Admin or Self)
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const currentUser = req.user!;
    const isAdmin = currentUser.role === 'ADMIN';
    const isSelf = currentUser.id === userId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Access denied. You can only edit your own profile.' });
    }

    const { name, email, role, status, password } = req.body;

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const emailCheck = await User.findOne({ email: cleanEmail, id: { $ne: userId } });
      if (emailCheck) {
        return res.status(400).json({ error: 'This email is already in use by another user.' });
      }
      user.email = cleanEmail;
    }

    if (name) user.name = name.trim();
    if (isAdmin && role) user.role = role;
    if (isAdmin && status) user.status = status;

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password.trim(), salt);
    }

    user.updated_at = new Date();
    await user.save();

    const userObj = user.toObject();
    delete (userObj as any).password_hash;

    return res.json({
      message: 'User updated successfully.',
      user: userObj,
    });
  } catch (error: any) {
    console.error('Error updating user in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// PUT /api/users/:id/status - Toggle activate/deactivate
router.put('/:id/status', authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE, INACTIVE, or SUSPENDED.' });
    }

    if (userId === req.user!.id && status !== 'ACTIVE') {
      return res.status(400).json({ error: 'You cannot deactivate your own administrative account.' });
    }

    const updated = await User.findOneAndUpdate(
      { id: userId },
      { $set: { status, updated_at: new Date() } },
      { new: true }
    ).select('-password_hash').lean();

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ message: `User status changed to ${status}.`, user: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to change user status.' });
  }
});

export default router;
