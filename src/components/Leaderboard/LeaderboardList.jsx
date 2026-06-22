import React from 'react';
import { useGame } from '../../context/GameContext';

export default function LeaderboardList() {
  const { leaderboard, currentUser } = useGame();

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>🏆 Global Tycoon Rankings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.5rem' }}>
          Top virtual businesses ranked by Level and Net Funds.
        </p>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Rank</th>
              <th style={styles.th}>Shop Name</th>
              <th style={styles.th}>Owner</th>
              <th style={styles.th}>Level</th>
              <th style={styles.th}>Net Funds</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => {
              const isMe = entry.shopId === currentUser?.uid;
              const isTop3 = index < 3;
              
              let rowStyle = { ...styles.tr };
              if (isMe) {
                rowStyle.backgroundColor = 'rgba(59, 130, 246, 0.15)';
              } else if (index % 2 !== 0) {
                rowStyle.backgroundColor = 'rgba(255, 255, 255, 0.02)';
              }

              let rankDisplay = `#${entry.rank}`;
              if (index === 0) rankDisplay = '🥇 1st';
              if (index === 1) rankDisplay = '🥈 2nd';
              if (index === 2) rankDisplay = '🥉 3rd';

              return (
                <tr key={entry.shopId} style={rowStyle}>
                  <td style={{ ...styles.td, fontWeight: isTop3 ? '800' : '600', color: isTop3 ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                    {rankDisplay}
                  </td>
                  <td style={{ ...styles.td, fontWeight: 'bold', color: isMe ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                    {entry.shopName} {isMe && '(You)'}
                  </td>
                  <td style={styles.td}>
                    <span className="badge badge-common" style={{ fontSize: '0.7rem' }}>{entry.ownerName}</span>
                  </td>
                  <td style={{ ...styles.td, color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                    {entry.level}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--accent-green)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                    ${entry.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '1.25rem 1.5rem',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-color)'
  },
  tr: {
    transition: 'background-color var(--transition-fast)',
    borderBottom: '1px solid rgba(255,255,255,0.02)'
  },
  td: {
    padding: '1.25rem 1.5rem',
    fontSize: '0.95rem'
  }
};
