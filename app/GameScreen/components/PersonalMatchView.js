import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const PersonalOption = ({ compact, disabled, index, label, onPress, selected }) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected, disabled }}
    accessibilityLabel={`Option ${index + 1}: ${label}`}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.option,
      compact && styles.optionCompact,
      selected && styles.optionSelected,
      pressed && !disabled && styles.pressed,
      disabled && styles.disabled,
    ]}
  >
    <View style={[styles.optionBadge, selected && styles.optionBadgeSelected]}>
      <Text style={styles.optionBadgeText}>{String.fromCharCode(65 + index)}</Text>
    </View>
    <Text style={[styles.optionText, compact && styles.optionTextCompact]}>{label}</Text>
  </Pressable>
);

const PersonalMatchView = ({
  canComplete,
  challenge,
  compact = false,
  onChallengeAction,
  penaltySips,
  remainingSeconds,
}) => {
  const [pendingOptionIndex, setPendingOptionIndex] = useState(null);
  const stage = challenge?.stage || 'handoff';
  const options = Array.isArray(challenge?.personalQuestionOptions)
    ? challenge.personalQuestionOptions
    : [];

  useEffect(() => {
    setPendingOptionIndex(null);
  }, [challenge?.personalQuestionId, stage]);

  if (!canComplete && stage !== 'result') {
    return (
      <View style={styles.centered}>
        <Text style={[styles.title, compact && styles.titleCompact]}>CHALLENGE IN PROGRESS</Text>
        <Text style={[styles.copy, compact && styles.copyCompact]}>
          The active team is playing on their team leader&apos;s device.
        </Text>
      </View>
    );
  }

  if (stage === 'handoff') {
    return (
      <View style={styles.centered}>
        <Text style={styles.eyebrow}>SECRET ANSWER</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>PASS THE PHONE</Text>
        <Text style={[styles.copy, compact && styles.copyCompact]}>
          Give the phone to {challenge.selectedPlayerName || 'the selected teammate'} and keep the screen hidden from the team.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start secret answer with ${challenge.selectedPlayerName || 'selected teammate'}`}
          onPress={() => onChallengeAction?.({ type: 'startPersonalAnswering' })}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>I HAVE THE PHONE</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === 'returnPhone') {
    return (
      <View style={styles.centered}>
        <Text style={styles.eyebrow}>ANSWER LOCKED</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>HIDE THE SCREEN</Text>
        <Text style={[styles.copy, compact && styles.copyCompact]}>
          Pass the phone back to the rest of the team. Your answer stays hidden until the reveal.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirm the team has the phone"
          onPress={() => onChallengeAction?.({ type: 'startPersonalGuessing' })}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>TEAM READY</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === 'result') {
    const matched = challenge.result === 'matched';
    const answer = options[Number(challenge.selectedAnswerIndex)] || 'Unknown answer';
    const guess = challenge.teamGuessIndex !== null
      && challenge.teamGuessIndex !== undefined
      && Number.isInteger(Number(challenge.teamGuessIndex))
      ? options[Number(challenge.teamGuessIndex)]
      : null;
    return (
      <View style={styles.centered}>
        <Text style={styles.eyebrow}>{matched ? 'PERFECT MATCH' : 'NOT A MATCH'}</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>
          {matched ? `+${challenge.pointsAwarded || challenge.successPoints || 10} POINTS` : '0 POINTS'}
        </Text>
        <View style={styles.revealBox}>
          <Text style={styles.revealLabel}>{`${challenge.selectedPlayerName || 'THE RESPONDENT'} ANSWERED`}</Text>
          <Text style={styles.revealAnswer}>{answer}</Text>
          <Text style={styles.revealLabel}>TEAM GUESSED</Text>
          <Text style={styles.revealGuess}>{guess || 'TIME RAN OUT'}</Text>
        </View>
        <Text style={[styles.resultCopy, compact && styles.copyCompact]}>
          {matched
            ? `${challenge.selectedPlayerName || 'The respondent'} takes ${penaltySips} ${penaltySips === 1 ? 'sip' : 'sips'}.`
            : `Every teammate except ${challenge.selectedPlayerName || 'the respondent'} takes ${penaltySips} ${penaltySips === 1 ? 'sip' : 'sips'}.`}
        </Text>
      </View>
    );
  }

  const isAnswering = stage === 'answering';
  const isGuessing = stage === 'guessing';
  return (
    <View style={styles.content}>
      <View style={styles.questionHeader}>
        <Text style={styles.eyebrow}>{isAnswering ? 'CHOOSE IN SECRET' : 'MATCH YOUR TEAMMATE'}</Text>
        {isGuessing ? (
          <Text style={styles.timer}>{`00:${String(remainingSeconds).padStart(2, '0')}`}</Text>
        ) : null}
      </View>
      <Text style={[styles.question, compact && styles.questionCompact]}>
        {challenge.personalQuestionPrompt}
      </Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option, index) => (
          <PersonalOption
            compact={compact}
            disabled={!canComplete}
            index={index}
            key={`${challenge.personalQuestionId}:${index}`}
            label={option}
            onPress={() => setPendingOptionIndex(index)}
            selected={pendingOptionIndex === index}
          />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isAnswering ? 'Lock secret answer' : 'Lock team guess'}
        disabled={pendingOptionIndex === null || !canComplete}
        onPress={() => onChallengeAction?.(isAnswering
          ? { type: 'submitPersonalAnswer', answerIndex: pendingOptionIndex }
          : { type: 'submitPersonalGuess', guessIndex: pendingOptionIndex })}
        style={({ pressed }) => [
          styles.primaryButton,
          styles.confirmButton,
          (pendingOptionIndex === null || !canComplete) && styles.disabled,
          pressed && pendingOptionIndex !== null && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>{isAnswering ? 'LOCK MY ANSWER' : 'LOCK TEAM GUESS'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center' },
  eyebrow: {
    color: '#E8412F',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    lineHeight: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 20,
    lineHeight: 28,
    marginTop: 8,
    textAlign: 'center',
  },
  titleCompact: { fontSize: 15, lineHeight: 20, marginTop: 4 },
  copy: {
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  copyCompact: { fontSize: 8, lineHeight: 13, marginTop: 5 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1BA39C',
    borderColor: '#111111',
    borderRadius: 9,
    borderWidth: 3,
    borderBottomWidth: 6,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textAlign: 'center',
  },
  pressed: { opacity: 0.86, transform: [{ translateY: 2 }] },
  disabled: { opacity: 0.45 },
  questionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  timer: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
  },
  question: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  questionCompact: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  options: { gap: 5, marginTop: 8 },
  option: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#111111',
    borderRadius: 7,
    borderWidth: 2,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  optionCompact: { minHeight: 27, paddingVertical: 3 },
  optionSelected: { backgroundColor: '#FFD166', borderWidth: 3 },
  optionBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF1CD',
    borderColor: '#111111',
    borderRadius: 4,
    borderWidth: 2,
    height: 23,
    justifyContent: 'center',
    marginRight: 8,
    width: 23,
  },
  optionBadgeSelected: { backgroundColor: '#1BA39C' },
  optionBadgeText: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 8 },
  optionText: { color: '#111111', flex: 1, fontFamily: 'dogicapixel', fontSize: 8, lineHeight: 12 },
  optionTextCompact: { fontSize: 7, lineHeight: 10 },
  confirmButton: { marginTop: 8, minHeight: 35, paddingVertical: 6 },
  revealBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#111111',
    borderRadius: 8,
    borderWidth: 3,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  revealLabel: {
    color: '#4A5A6B',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    marginTop: 3,
    textAlign: 'center',
  },
  revealAnswer: {
    color: '#1BA39C',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 5,
    marginTop: 3,
    textAlign: 'center',
  },
  revealGuess: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
    textAlign: 'center',
  },
  resultCopy: {
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default PersonalMatchView;
