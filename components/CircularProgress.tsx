import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Typography } from './ui/text';

interface CircularProgressProps {
  percentage: number;
  radius?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  radius = 35,
  strokeWidth = 6,
  color = '#FFFFFF',
  backgroundColor = 'rgba(255,255,255,0.2)'
}) => {
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.container}>
      <Svg height={radius * 2} width={radius * 2}>
        <Circle
          stroke={backgroundColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <Circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          rotation="-90"
          originX={radius}
          originY={radius}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.textContainer]}>
        <Typography variant="bold" style={[styles.text, { color }]}>
          {Math.round(percentage)}%
        </Typography>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
  }
});
