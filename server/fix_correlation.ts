import { readFileSync, writeFileSync } from 'fs';

const path = '/mnt/ssd/Fintrack/server/src/routes/reports.ts';
let code = readFileSync(path, 'utf-8');

const replacement = `
    // 4. MoM Correlation Matrix
    // Real correlation calculation
    const correlationMatrix: Record<string, Record<string, number>> = {};
    const groupsNames = groups.map(g => g.name);
    
    // Build MoM returns for each group
    const groupMoMs: Record<string, number[]> = {};
    
    for (const group of groups) {
      const gVals = valuations.filter(v => 
        group.items.some(i => i.id === v.item.id || i.children.some(c => c.id === v.item.id))
      );
      // aggregate per month
      const moVals: Record<string, number> = {};
      for (const v of gVals) {
        const m = dayjs(v.month).format('YYYY-MM');
        moVals[m] = (moVals[m] || 0) + Number(v.value);
      }
      // calculate MoM
      const moms: number[] = [];
      for (let i = 1; i < sortedMonths.length; i++) {
         const m1 = sortedMonths[i-1];
         const m2 = sortedMonths[i];
         const v1 = moVals[m1] || 0;
         const v2 = moVals[m2] || 0;
         const ret = v1 > 0 ? (v2 - v1) / v1 : 0;
         moms.push(ret);
      }
      groupMoMs[group.name] = moms;
    }

    const pearsonCorrelation = (xs: number[], ys: number[]) => {
      if (xs.length !== ys.length || xs.length === 0) return 0;
      const mx = xs.reduce((a,b) => a+b, 0) / xs.length;
      const my = ys.reduce((a,b) => a+b, 0) / ys.length;
      let sx = 0, sy = 0, sxy = 0;
      for (let i = 0; i < xs.length; i++) {
        const rx = xs[i] - mx;
        const ry = ys[i] - my;
        sx += rx * rx;
        sy += ry * ry;
        sxy += rx * ry;
      }
      if (sx === 0 || sy === 0) return 0;
      return sxy / Math.sqrt(sx * sy);
    };

    for (const g1 of groupsNames) {
      correlationMatrix[g1] = {};
      for (const g2 of groupsNames) {
        correlationMatrix[g1][g2] = g1 === g2 ? 1.0 : pearsonCorrelation(groupMoMs[g1], groupMoMs[g2]);
      }
    }
`;

code = code.replace(/\/\/ 4\. MoM Correlation Matrix[\s\S]*?(?=return res\.json)/, replacement);

writeFileSync(path, code);
console.log('Fixed correlation');
