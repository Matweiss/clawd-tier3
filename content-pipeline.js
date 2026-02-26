// content-pipeline.js - Tier 3: Auto-generate follow-up content
// Draft emails, LinkedIn messages, proposals

class ContentPipeline {
  constructor() {
    this.templates = {
      followUp: this.followUpTemplate,
      proposal: this.proposalTemplate,
      checkIn: this.checkInTemplate,
      thankYou: this.thankYouTemplate
    };
  }

  async generate(type, context) {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`Unknown content type: ${type}`);
    }
    
    return template.call(this, context);
  }

  followUpTemplate(ctx) {
    const { company, contact, lastMeeting, nextSteps, dealValue } = ctx;
    
    let content = `Subject: Following up on our ${lastMeeting?.topic || 'conversation'}\n\n`;
    content += `Hi ${contact?.name?.split(' ')[0] || 'there'},\n\n`;
    content += `Thanks for taking the time to meet${lastMeeting ? ` on ${lastMeeting.date}` : ''}.\n\n`;
    
    if (nextSteps?.length > 0) {
      content += `As discussed, I've attached:\n`;
      for (const step of nextSteps) {
        content += `• ${step}\n`;
      }
      content += `\n`;
    }
    
    content += `Please let me know if you have any questions or if there's anything else I can provide.\n\n`;
    content += `Looking forward to hearing from you.\n\n`;
    content += `Best,\nMat\n\n`;
    content += `--\nMat Weiss | Craftable\nmat@craftable.com | (858) 123-4567`;
    
    return {
      type: 'email',
      subject: `Following up - ${company || 'Craftable'}`,
      body: content,
      draft: true, // Never auto-send
      context: ctx
    };
  }

  proposalTemplate(ctx) {
    const { company, dealValue, deliverables, timeline } = ctx;
    
    let content = `Subject: Proposal: ${company} + Craftable Partnership\n\n`;
    content += `Hi team,\n\n`;
    content += `Thank you for considering Craftable for ${company}. `;
    content += `Based on our conversations, I've prepared the following proposal:\n\n`;
    
    content += `## Scope of Work\n`;
    if (deliverables?.length > 0) {
      for (const item of deliverables) {
        content += `• ${item}\n`;
      }
    }
    content += `\n`;
    
    content += `## Investment\n`;
    content += `Total: ${dealValue || 'TBD'}\n\n`;
    
    if (timeline) {
      content += `## Timeline\n`;
      content += `${timeline}\n\n`;
    }
    
    content += `## Next Steps\n`;
    content += `1. Review proposal\n`;
    content += `2. Schedule technical deep-dive\n`;
    content += `3. Finalize contract\n\n`;
    
    content += `Please review and let me know your thoughts.\n\n`;
    content += `Best,\nMat`;
    
    return {
      type: 'proposal',
      subject: `Proposal: ${company} + Craftable`,
      body: content,
      draft: true,
      context: ctx
    };
  }

  checkInTemplate(ctx) {
    const { company, contact, daysSinceContact } = ctx;
    
    let content = `Subject: Quick check-in\n\n`;
    content += `Hi ${contact?.name?.split(' ')[0] || 'there'},\n\n`;
    
    if (daysSinceContact > 14) {
      content += `It's been a few weeks since we last connected. `;
    }
    
    content += `I wanted to check in and see how things are going at ${company || 'your company'}.\n\n`;
    content += `Is there anything I can help with?\n\n`;
    content += `Best,\nMat`;
    
    return {
      type: 'email',
      subject: `Quick check-in`,
      body: content,
      draft: true,
      context: ctx
    };
  }

  thankYouTemplate(ctx) {
    const { company, contact, meetingType } = ctx;
    
    let content = `Subject: Thank you${meetingType ? ` for the ${meetingType}` : ''}\n\n`;
    content += `Hi ${contact?.name?.split(' ')[0] || 'there'},\n\n`;
    content += `Thank you${meetingType ? ` for taking the time to ${meetingType} today` : ' for your time today'}. `;
    content += `I really enjoyed learning more about ${company || 'your company'} and how we might be able to help.\n\n`;
    content += `I'll follow up with the items we discussed shortly.\n\n`;
    content += `Talk soon,\nMat`;
    
    return {
      type: 'email',
      subject: `Thank you${meetingType ? ` - ${meetingType}` : ''}`,
      body: content,
      draft: true,
      context: ctx
    };
  }

  // Smart suggestions based on deal stage
  async suggestContent(dealData) {
    const suggestions = [];
    
    const { stage, daysInStage, lastContact, meetingScheduled } = dealData;
    
    // Check for stale deals
    if (daysInStage > 7 && !meetingScheduled) {
      suggestions.push({
        type: 'checkIn',
        reason: `No activity for ${daysInStage} days`,
        urgency: 'medium'
      });
    }
    
    // Post-meeting follow-up
    if (lastContact?.type === 'meeting' && lastContact.daysAgo <= 1) {
      suggestions.push({
        type: 'followUp',
        reason: 'Meeting completed yesterday',
        urgency: 'high'
      });
    }
    
    // Proposal stage
    if (stage === 'Proposal' && daysInStage > 3) {
      suggestions.push({
        type: 'followUp',
        reason: 'Proposal sent, awaiting response',
        urgency: 'high'
      });
    }
    
    // Contract stage
    if (stage === 'Contract' && daysInStage > 2) {
      suggestions.push({
        type: 'checkIn',
        reason: 'Contract pending signature',
        urgency: 'high'
      });
    }
    
    return suggestions;
  }

  // Queue for Mat's approval
  async queueForApproval(content) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { error } = await supabase
      .from('content_drafts')
      .insert({
        type: content.type,
        subject: content.subject,
        body: content.body,
        context: content.context,
        status: 'pending',
        created_at: new Date()
      });
    
    if (error) {
      console.error('[CONTENT] Failed to queue:', error.message);
      return false;
    }
    
    // Notify Mat
    const notifier = require('./smart-notifications.js');
    await notifier.send({
      type: 'content_ready',
      priority: 'normal',
      content: `📝 Draft ready: ${content.subject}`
    });
    
    return true;
  }
}

module.exports = ContentPipeline;

// Usage:
// const pipeline = new ContentPipeline();
// const draft = await pipeline.generate('followUp', { company, contact, ... });
// await pipeline.queueForApproval(draft);
