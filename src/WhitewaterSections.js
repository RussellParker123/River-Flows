import React from 'react';

export function WhitewaterSections({ river, selectedSegment, onSelect, gradeColors }) {
  if (!river.segments?.length) return null;

  return (
    <section className="whitewater-sections" aria-label={`${river.name} whitewater sections`}>
      <h4>Whitewater sections</h4>
      <div className="whitewater-section-list">
        {river.segments.map((segment) => {
          const grade = segment.grade || river.grade;
          const isSelected = selectedSegment?.name === segment.name;

          return (
            <button
              key={segment.name}
              type="button"
              className={`whitewater-section${isSelected ? ' is-selected' : ''}`}
              aria-label={`${segment.name}, Class ${grade}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(segment)}
              style={{ '--section-grade-color': gradeColors[grade] || '#666' }}
            >
              <span>{segment.name}</span>
              <span className="whitewater-section-grade">Class {grade}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
