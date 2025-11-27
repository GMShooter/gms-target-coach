import time

class RoundDetector:
    def __init__(self, time_threshold: float = 5.0):
        self.time_threshold = time_threshold
        self.last_shot_time = 0.0
        self.current_round = 1

    def process_shot(self, shot_time: float) -> int:
        if self.last_shot_time > 0 and (shot_time - self.last_shot_time) > self.time_threshold:
            self.current_round += 1
        
        self.last_shot_time = shot_time
        return self.current_round

    def reset(self):
        self.current_round = 1
        self.last_shot_time = 0.0
