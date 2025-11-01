const Policy = require('../models/Policy');

exports.getAllPolicies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;
    
    let query = { isActive: true };
    
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const policies = await Policy.find(query)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Policy.countDocuments(query);

    res.json({
      success: true,
      data: {
        policies,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    
    const policy = await Policy.create({
      title,
      content,
      category,
      tags,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, lastModifiedBy: req.user.id };
    
    const policy = await Policy.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await Policy.findByIdAndUpdate(
      id, 
      { isActive: false }, 
      { new: true }
    );

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({ success: true, message: 'Policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
