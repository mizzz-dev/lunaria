
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  discordId: 'discordId',
  username: 'username',
  discriminator: 'discriminator',
  avatar: 'avatar',
  email: 'email',
  globalName: 'globalName',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  tokenExpiresAt: 'tokenExpiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GuildScalarFieldEnum = {
  id: 'id',
  discordId: 'discordId',
  name: 'name',
  icon: 'icon',
  ownerId: 'ownerId',
  botJoinedAt: 'botJoinedAt',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GuildMembershipScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  userId: 'userId',
  discordRoles: 'discordRoles',
  nickname: 'nickname',
  joinedAt: 'joinedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PluginScalarFieldEnum = {
  id: 'id',
  pluginKey: 'pluginKey',
  name: 'name',
  description: 'description',
  version: 'version',
  configSchema: 'configSchema',
  auditEvents: 'auditEvents',
  billingTier: 'billingTier',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PluginDependencyScalarFieldEnum = {
  id: 'id',
  pluginId: 'pluginId',
  dependsOnId: 'dependsOnId'
};

exports.Prisma.GuildPluginSettingScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  pluginId: 'pluginId',
  enabled: 'enabled',
  config: 'config',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConfigVersionScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  scope: 'scope',
  version: 'version',
  snapshot: 'snapshot',
  changedBy: 'changedBy',
  changeNote: 'changeNote',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  actorId: 'actorId',
  actorType: 'actorType',
  action: 'action',
  targetType: 'targetType',
  targetId: 'targetId',
  before: 'before',
  after: 'after',
  metadata: 'metadata',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.RbacRoleScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  description: 'description',
  isSystem: 'isSystem',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RbacPermissionScalarFieldEnum = {
  id: 'id',
  key: 'key',
  description: 'description',
  category: 'category'
};

exports.Prisma.RbacRolePermissionScalarFieldEnum = {
  id: 'id',
  roleId: 'roleId',
  permissionId: 'permissionId'
};

exports.Prisma.GuildMemberRoleAssignmentScalarFieldEnum = {
  id: 'id',
  membershipId: 'membershipId',
  roleId: 'roleId',
  userId: 'userId',
  assignedBy: 'assignedBy',
  createdAt: 'createdAt'
};

exports.Prisma.RuleScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  description: 'description',
  enabled: 'enabled',
  trigger: 'trigger',
  triggerConfig: 'triggerConfig',
  conditions: 'conditions',
  actions: 'actions',
  priority: 'priority',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RuleRunScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  ruleId: 'ruleId',
  status: 'status',
  trigger: 'trigger',
  context: 'context',
  actionsRan: 'actionsRan',
  error: 'error',
  durationMs: 'durationMs',
  createdAt: 'createdAt'
};

exports.Prisma.AutoResponseScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  enabled: 'enabled',
  matchType: 'matchType',
  pattern: 'pattern',
  responseType: 'responseType',
  response: 'response',
  channelIds: 'channelIds',
  triggerRoles: 'triggerRoles',
  ignoreBots: 'ignoreBots',
  caseSensitive: 'caseSensitive',
  cooldownSec: 'cooldownSec',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuoteScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  content: 'content',
  author: 'author',
  authorId: 'authorId',
  addedBy: 'addedBy',
  channelId: 'channelId',
  messageId: 'messageId',
  attachments: 'attachments',
  tags: 'tags',
  deleted: 'deleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuoteReportScalarFieldEnum = {
  id: 'id',
  quoteId: 'quoteId',
  reportedBy: 'reportedBy',
  reason: 'reason',
  resolved: 'resolved',
  createdAt: 'createdAt'
};

exports.Prisma.DailyContentJobScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  enabled: 'enabled',
  channelId: 'channelId',
  contentType: 'contentType',
  cronExpr: 'cronExpr',
  timezone: 'timezone',
  template: 'template',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DailyContentRunScalarFieldEnum = {
  id: 'id',
  jobId: 'jobId',
  status: 'status',
  messageId: 'messageId',
  error: 'error',
  createdAt: 'createdAt'
};

exports.Prisma.PollScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  channelId: 'channelId',
  messageId: 'messageId',
  title: 'title',
  description: 'description',
  voteType: 'voteType',
  anonymous: 'anonymous',
  endsAt: 'endsAt',
  closed: 'closed',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PollOptionScalarFieldEnum = {
  id: 'id',
  pollId: 'pollId',
  label: 'label',
  emoji: 'emoji',
  position: 'position'
};

exports.Prisma.PollVoteScalarFieldEnum = {
  id: 'id',
  pollId: 'pollId',
  optionId: 'optionId',
  voterId: 'voterId',
  createdAt: 'createdAt'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  channelId: 'channelId',
  title: 'title',
  description: 'description',
  location: 'location',
  startsAt: 'startsAt',
  endsAt: 'endsAt',
  maxParticipants: 'maxParticipants',
  status: 'status',
  visibility: 'visibility',
  allowedRoles: 'allowedRoles',
  createdBy: 'createdBy',
  messageId: 'messageId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventParticipantScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  userId: 'userId',
  status: 'status',
  joinedAt: 'joinedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LfgPostScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  channelId: 'channelId',
  messageId: 'messageId',
  title: 'title',
  description: 'description',
  game: 'game',
  status: 'status',
  maxPlayers: 'maxPlayers',
  expiresAt: 'expiresAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LfgEntryScalarFieldEnum = {
  id: 'id',
  lfgId: 'lfgId',
  userId: 'userId',
  note: 'note',
  joinedAt: 'joinedAt'
};

exports.Prisma.TeamSetScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  splitMode: 'splitMode',
  teamCount: 'teamCount',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamScalarFieldEnum = {
  id: 'id',
  teamSetId: 'teamSetId',
  name: 'name',
  color: 'color',
  position: 'position'
};

exports.Prisma.TeamMemberScalarFieldEnum = {
  id: 'id',
  teamId: 'teamId',
  userId: 'userId',
  role: 'role'
};

exports.Prisma.FaqArticleScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  title: 'title',
  content: 'content',
  tags: 'tags',
  status: 'status',
  viewCount: 'viewCount',
  helpful: 'helpful',
  notHelpful: 'notHelpful',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FaqFeedbackScalarFieldEnum = {
  id: 'id',
  articleId: 'articleId',
  userId: 'userId',
  rating: 'rating',
  comment: 'comment',
  createdAt: 'createdAt'
};

exports.Prisma.ReminderScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  userId: 'userId',
  channelId: 'channelId',
  content: 'content',
  remindAt: 'remindAt',
  sent: 'sent',
  sentAt: 'sentAt',
  recurrence: 'recurrence',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ModerationRuleScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  enabled: 'enabled',
  ruleType: 'ruleType',
  config: 'config',
  action: 'action',
  actionConfig: 'actionConfig',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ModerationActionScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  ruleId: 'ruleId',
  actionType: 'actionType',
  targetId: 'targetId',
  moderatorId: 'moderatorId',
  reason: 'reason',
  expiresAt: 'expiresAt',
  reversed: 'reversed',
  reversedAt: 'reversedAt',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsEventScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  eventType: 'eventType',
  userId: 'userId',
  channelId: 'channelId',
  metadata: 'metadata',
  occurredAt: 'occurredAt'
};

exports.Prisma.AnalyticsDailyScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  date: 'date',
  metrics: 'metrics',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TemplateScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  description: 'description',
  category: 'category',
  body: 'body',
  tags: 'tags',
  visibility: 'visibility',
  createdBy: 'createdBy',
  useCount: 'useCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TemplateApplicationScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  guildId: 'guildId',
  appliedBy: 'appliedBy',
  resultId: 'resultId',
  resultType: 'resultType',
  createdAt: 'createdAt'
};

exports.Prisma.GameLinkScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  platform: 'platform',
  platformId: 'platformId',
  displayName: 'displayName',
  verified: 'verified',
  verifiedAt: 'verifiedAt',
  accessToken: 'accessToken',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConsentRecordScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  guildId: 'guildId',
  consentType: 'consentType',
  granted: 'granted',
  grantedAt: 'grantedAt',
  revokedAt: 'revokedAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  metadata: 'metadata'
};

exports.Prisma.ExternalServerScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  serverType: 'serverType',
  host: 'host',
  port: 'port',
  status: 'status',
  credentials: 'credentials',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExternalServerActionScalarFieldEnum = {
  id: 'id',
  serverId: 'serverId',
  actionType: 'actionType',
  status: 'status',
  requestedBy: 'requestedBy',
  result: 'result',
  error: 'error',
  createdAt: 'createdAt'
};

exports.Prisma.WelcomeConfigScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  enabled: 'enabled',
  channelId: 'channelId',
  dmEnabled: 'dmEnabled',
  message: 'message',
  dmMessage: 'dmMessage',
  embedColor: 'embedColor',
  showAvatar: 'showAvatar',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LevelConfigScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  enabled: 'enabled',
  xpPerMessage: 'xpPerMessage',
  xpCooldownSec: 'xpCooldownSec',
  levelUpChannelId: 'levelUpChannelId',
  levelUpMessage: 'levelUpMessage',
  ignoredChannels: 'ignoredChannels',
  ignoredRoles: 'ignoredRoles',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserLevelScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  userId: 'userId',
  xp: 'xp',
  level: 'level',
  messages: 'messages',
  lastXpAt: 'lastXpAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LevelRewardScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  level: 'level',
  roleId: 'roleId',
  removeOnLevel: 'removeOnLevel',
  createdAt: 'createdAt'
};

exports.Prisma.TicketConfigScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  enabled: 'enabled',
  panelChannelId: 'panelChannelId',
  categoryId: 'categoryId',
  supportRoleIds: 'supportRoleIds',
  welcomeMessage: 'welcomeMessage',
  maxOpenPerUser: 'maxOpenPerUser',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  configId: 'configId',
  channelId: 'channelId',
  openedBy: 'openedBy',
  claimedBy: 'claimedBy',
  subject: 'subject',
  status: 'status',
  closedAt: 'closedAt',
  closedBy: 'closedBy',
  transcript: 'transcript',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TempVcConfigScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  enabled: 'enabled',
  triggerChannelId: 'triggerChannelId',
  categoryId: 'categoryId',
  nameTemplate: 'nameTemplate',
  maxChannels: 'maxChannels',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TempVoiceChannelScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  configId: 'configId',
  channelId: 'channelId',
  ownerId: 'ownerId',
  createdAt: 'createdAt'
};

exports.Prisma.PollRoleRewardScalarFieldEnum = {
  id: 'id',
  pollId: 'pollId',
  optionId: 'optionId',
  roleId: 'roleId',
  createdAt: 'createdAt'
};

exports.Prisma.ScheduledMessageScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  channelId: 'channelId',
  content: 'content',
  embedData: 'embedData',
  scheduledAt: 'scheduledAt',
  status: 'status',
  sentAt: 'sentAt',
  messageId: 'messageId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VoiceLogConfigScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  enabled: 'enabled',
  channelId: 'channelId',
  logJoin: 'logJoin',
  logLeave: 'logLeave',
  logMove: 'logMove',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VoiceLogScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  configId: 'configId',
  userId: 'userId',
  channelId: 'channelId',
  fromChannelId: 'fromChannelId',
  eventType: 'eventType',
  occurredAt: 'occurredAt'
};

exports.Prisma.CustomComponentScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  name: 'name',
  componentType: 'componentType',
  label: 'label',
  emoji: 'emoji',
  style: 'style',
  customId: 'customId',
  actionType: 'actionType',
  actionConfig: 'actionConfig',
  enabled: 'enabled',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComponentInteractionScalarFieldEnum = {
  id: 'id',
  componentId: 'componentId',
  userId: 'userId',
  guildId: 'guildId',
  result: 'result',
  createdAt: 'createdAt'
};

exports.Prisma.AiModerationConfigScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  enabled: 'enabled',
  provider: 'provider',
  toxicityThreshold: 'toxicityThreshold',
  spamThreshold: 'spamThreshold',
  action: 'action',
  logChannelId: 'logChannelId',
  exemptRoles: 'exemptRoles',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AiModerationScanScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  configId: 'configId',
  messageId: 'messageId',
  userId: 'userId',
  channelId: 'channelId',
  content: 'content',
  flagged: 'flagged',
  scores: 'scores',
  actionTaken: 'actionTaken',
  createdAt: 'createdAt'
};

exports.Prisma.TranslationConfigScalarFieldEnum = {
  id: 'id',
  guildId: 'guildId',
  enabled: 'enabled',
  triggerEmoji: 'triggerEmoji',
  defaultTargetLang: 'defaultTargetLang',
  logChannelId: 'logChannelId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GuildGroupScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  ownerGuildId: 'ownerGuildId',
  inviteCode: 'inviteCode',
  joinMode: 'joinMode',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GuildGroupMemberScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  guildId: 'guildId',
  role: 'role',
  joinedAt: 'joinedAt'
};

exports.Prisma.CrossServerBroadcastScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  fromGuildId: 'fromGuildId',
  content: 'content',
  embedData: 'embedData',
  status: 'status',
  sentBy: 'sentBy',
  createdAt: 'createdAt'
};

exports.Prisma.BroadcastTargetScalarFieldEnum = {
  id: 'id',
  broadcastId: 'broadcastId',
  guildId: 'guildId',
  channelId: 'channelId',
  status: 'status',
  messageId: 'messageId',
  error: 'error',
  sentAt: 'sentAt'
};

exports.Prisma.NotificationSubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  guildId: 'guildId',
  endpoint: 'endpoint',
  p256dh: 'p256dh',
  auth: 'auth',
  eventTypes: 'eventTypes',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  guildId: 'guildId',
  eventType: 'eventType',
  title: 'title',
  body: 'body',
  url: 'url',
  read: 'read',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  Guild: 'Guild',
  GuildMembership: 'GuildMembership',
  Plugin: 'Plugin',
  PluginDependency: 'PluginDependency',
  GuildPluginSetting: 'GuildPluginSetting',
  ConfigVersion: 'ConfigVersion',
  AuditLog: 'AuditLog',
  RbacRole: 'RbacRole',
  RbacPermission: 'RbacPermission',
  RbacRolePermission: 'RbacRolePermission',
  GuildMemberRoleAssignment: 'GuildMemberRoleAssignment',
  Rule: 'Rule',
  RuleRun: 'RuleRun',
  AutoResponse: 'AutoResponse',
  Quote: 'Quote',
  QuoteReport: 'QuoteReport',
  DailyContentJob: 'DailyContentJob',
  DailyContentRun: 'DailyContentRun',
  Poll: 'Poll',
  PollOption: 'PollOption',
  PollVote: 'PollVote',
  Event: 'Event',
  EventParticipant: 'EventParticipant',
  LfgPost: 'LfgPost',
  LfgEntry: 'LfgEntry',
  TeamSet: 'TeamSet',
  Team: 'Team',
  TeamMember: 'TeamMember',
  FaqArticle: 'FaqArticle',
  FaqFeedback: 'FaqFeedback',
  Reminder: 'Reminder',
  ModerationRule: 'ModerationRule',
  ModerationAction: 'ModerationAction',
  AnalyticsEvent: 'AnalyticsEvent',
  AnalyticsDaily: 'AnalyticsDaily',
  Template: 'Template',
  TemplateApplication: 'TemplateApplication',
  GameLink: 'GameLink',
  ConsentRecord: 'ConsentRecord',
  ExternalServer: 'ExternalServer',
  ExternalServerAction: 'ExternalServerAction',
  WelcomeConfig: 'WelcomeConfig',
  LevelConfig: 'LevelConfig',
  UserLevel: 'UserLevel',
  LevelReward: 'LevelReward',
  TicketConfig: 'TicketConfig',
  Ticket: 'Ticket',
  TempVcConfig: 'TempVcConfig',
  TempVoiceChannel: 'TempVoiceChannel',
  PollRoleReward: 'PollRoleReward',
  ScheduledMessage: 'ScheduledMessage',
  VoiceLogConfig: 'VoiceLogConfig',
  VoiceLog: 'VoiceLog',
  CustomComponent: 'CustomComponent',
  ComponentInteraction: 'ComponentInteraction',
  AiModerationConfig: 'AiModerationConfig',
  AiModerationScan: 'AiModerationScan',
  TranslationConfig: 'TranslationConfig',
  GuildGroup: 'GuildGroup',
  GuildGroupMember: 'GuildGroupMember',
  CrossServerBroadcast: 'CrossServerBroadcast',
  BroadcastTarget: 'BroadcastTarget',
  NotificationSubscription: 'NotificationSubscription',
  Notification: 'Notification'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
