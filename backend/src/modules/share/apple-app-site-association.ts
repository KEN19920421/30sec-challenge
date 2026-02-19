import { Request, Response } from 'express';

export function appleAppSiteAssociation(_req: Request, res: Response): void {
  res.json({
    applinks: {
      apps: [],
      details: [{
        appIDs: [`${process.env.APPLE_TEAM_ID || 'TEAMID'}.com.thirtysecchallenge.thirtySecChallenge`],
        components: [
          { '/': '/s/*', comment: 'Submission deep links' },
          { '/': '/c/*', comment: 'Challenge deep links' },
          { '/': '/u/*', comment: 'User profile deep links' },
        ],
      }],
    },
  });
}
